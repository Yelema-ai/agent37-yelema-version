import { randomUUID } from "node:crypto";
import { agent37, instanceFetch } from "@/lib/agent37";
import { backofficeAgentRow, requireMember, requireUser } from "@/lib/auth";
import { cleanReply } from "@/lib/chat-errors";
import { visibleHistory } from "@/lib/compaction";
import { resumeSeed } from "@/lib/conversation-resume";
import { openConversation } from "@/lib/conversation-token";
import { agentTabPath } from "@/lib/expert-tabs";
import { expertDisplayName } from "@/lib/experts";
import { ApiError, handleError, json, readJson } from "@/lib/http";
import { DEFAULT_PROFILE, profileQuery, resolveProfile } from "@/lib/profiles";
import { authViaBackoffice } from "@/lib/runtime-config";
import type { AgentRow } from "@/lib/types";

// « Reprendre dans mon espace » : un membre qui a le lien d'une conversation partagée la continue chez lui, sur
// SA propre instance (ou son siège du chat d'entreprise), avec le même Expert s'il l'a. Rien n'est écrit chez le
// propriétaire ; la conversation copiée ouvre une nouvelle conversation, où l'Expert accuse seulement réception.
export async function POST(request: Request) {
  try {
    const body = await readJson<{ c?: string }>(request);
    const claims = openConversation(body.c);
    if (!claims) throw new ApiError(404, "not_found", "Ce lien n’ouvre plus de conversation : il a expiré ou il est incomplet.");
    const { db, user } = await requireUser();
    await requireMember(db, claims.w, user.id);
    const own = await ownAgent(db, claims.w, user.id);
    if (!own) throw new ApiError(409, "no_space", "Vous n’avez pas encore d’espace où reprendre cette conversation.");

    const detail = await agent37.getSession(claims.a, claims.s, profileQuery(claims.p), claims.u);
    const lines = visibleHistory(detail.history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.role === "assistant" ? cleanReply(m.content ?? "") : (m.content ?? "").trim() }))
      .filter((m) => m.content);
    if (!lines.length) throw new ApiError(409, "empty", "Cette conversation est vide.");

    // Le même Expert s'il est installé chez le destinataire, sinon son chat de base.
    const profile = claims.p && claims.p !== DEFAULT_PROFILE ? await resolveProfile(own, claims.p).catch(() => DEFAULT_PROFILE) : DEFAULT_PROFILE;
    const expert = claims.p === DEFAULT_PROFILE || !claims.p ? "l’assistant" : expertDisplayName(claims.p);
    const sessionId = randomUUID().replace(/-/g, "");
    const res = await instanceFetch(own.agent37_id, "/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: resumeSeed(lines, claims.o, expert), session_id: sessionId, stream: false, ...(profile !== DEFAULT_PROFILE ? { profile } : {}) }),
    });
    await res.body?.cancel().catch(() => undefined);
    if (!res.ok) throw new ApiError(502, "upstream_error", "La conversation n’a pas pu être reprise. Réessayez dans un instant.");
    const tab = agentTabPath(own.agent37_id, "chat", profile === DEFAULT_PROFILE ? null : profile);
    return json({ href: `${tab}?session=${sessionId}` });
  } catch (e) {
    return handleError(e);
  }
}

/** L'instance du membre dans cet espace (la sienne, ou son siège du chat d'entreprise). */
async function ownAgent(db: Awaited<ReturnType<typeof requireUser>>["db"], workspaceId: string, userId: string): Promise<AgentRow | null> {
  if (authViaBackoffice()) {
    const row = await backofficeAgentRow();
    return row && row.workspace_id === workspaceId ? row : null;
  }
  const { data } = await db.from("agents").select("*").eq("workspace_id", workspaceId).eq("owner_user_id", userId).limit(1).maybeSingle();
  return (data as AgentRow | null) ?? null;
}
