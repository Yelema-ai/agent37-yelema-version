import { agent37, instanceFetch } from "@/lib/agent37";
import { getSession } from "@/lib/auth";
import { listConnections } from "@/lib/composio";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashAppsToken } from "@/lib/composio";
import { withTimeout } from "@/lib/fetch-timeout";
import { profileQuery } from "@/lib/profile-id";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { answerRpc } from "@/lib/yele-mcp";
import {
  createYeleSupervisionBackend,
  KNOWN_EXPERTS,
  type RawFileInfo,
  type RawSessionInfo,
} from "@/lib/yele-supervision";

export const maxDuration = 120;
const MAX_BODY_BYTES = 32_768;
const TIMEOUT_MS = 15_000;

function errorJson(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();

  let agentId: string | null = null;
  let userId: string | null = null;

  // Verrouillage multi-tenant : vérifier le workspace épinglé s'il est configuré
  let pinnedWorkspace: string | undefined = undefined;
  try {
    pinnedWorkspace = await pinnedWorkspaceId();
  } catch {}

  const db = createAdminClient();

  if (token) {
    // Authentification par jeton d'instance (Hermes / yelema-hermes)
    const tokenHash = hashAppsToken(token);
    let q = db
      .from("agents")
      .select("agent37_id, user_id, workspace_id")
      .eq("apps_token_hash", tokenHash);

    if (pinnedWorkspace) {
      q = q.eq("workspace_id", pinnedWorkspace);
    }

    const { data: agent } = await q.maybeSingle();

    if (agent?.agent37_id) {
      agentId = agent.agent37_id;
      userId = agent.user_id;
    }
  }

  if (!agentId || !userId) {
    // Authentification par session utilisateur (Bulle web Yélé)
    const { user } = await getSession();
    if (user) {
      userId = user.id;
      let q = db
        .from("agents")
        .select("agent37_id, workspace_id")
        .eq("user_id", user.id);

      if (pinnedWorkspace) {
        q = q.eq("workspace_id", pinnedWorkspace);
      }

      const { data: agent } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agent?.agent37_id) {
        agentId = agent.agent37_id;
      }
    }
  }

  if (!agentId || !userId) {
    return errorJson(401, "Non authentifié ou instance introuvable.");
  }

  const raw = await request.text();
  let message: unknown;
  try {
    if (raw.length > MAX_BODY_BYTES) throw new Error("Requête trop volumineuse.");
    message = JSON.parse(raw);
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const resolvedAgentId = agentId;
  const resolvedUserId = userId;

  // Création du backend réel avec les dépendances injectées et protégées par timeout
  const backend = createYeleSupervisionBackend({
    listSessions: async (): Promise<RawSessionInfo[]> => {
      const results: RawSessionInfo[] = [];
      await Promise.all(
        KNOWN_EXPERTS.map(async (exp) => {
          try {
            const { data } = await agent37.listSessions(resolvedAgentId, profileQuery(exp));
            for (const s of data) {
              results.push({
                id: s.id,
                profile: exp,
                last_active: s.last_active,
                started_at: s.started_at,
              });
            }
          } catch {}
        })
      );
      return results;
    },
    fetchFileContent: async (path: string): Promise<string | null> => {
      try {
        const res = await instanceFetch(
          resolvedAgentId,
          `/v1/files/content?path=${encodeURIComponent(path)}`,
          withTimeout(undefined, TIMEOUT_MS)
        );
        return res.ok ? await res.text() : null;
      } catch {
        return null;
      }
    },
    listConnections: async () => {
      try {
        const { connections } = await listConnections(resolvedUserId);
        return connections.map((c) => ({
          toolkitSlug: c.toolkitSlug,
          status: c.status,
          isDisabled: c.isDisabled,
          alias: c.alias,
        }));
      } catch {
        return [];
      }
    },
    listDeliverableFiles: async (): Promise<RawFileInfo[]> => {
      try {
        const res = await instanceFetch(
          resolvedAgentId,
          `/v1/files/list?path=${encodeURIComponent("~/Livrables")}`,
          withTimeout(undefined, TIMEOUT_MS)
        );
        if (!res.ok) return [];
        const data = (await res.json()) as { files?: RawFileInfo[]; entries?: RawFileInfo[] };
        return data.files ?? data.entries ?? [];
      } catch {
        return [];
      }
    },
  });

  try {
    const batch = Array.isArray(message) ? message.slice(0, 20) : [message];
    const answers = (await Promise.all(batch.map((m) => answerRpc(m, backend)))).filter((a) => a !== null);
    if (answers.length === 0) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(message) ? answers : answers[0], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.warn("[yele-mcp] Erreur lors du traitement RPC:", e instanceof Error ? e.message : e);
    return errorJson(500, "Erreur interne du serveur de supervision.");
  }
}

export function GET(): Response {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
