import { requireAgentAccess } from "@/lib/auth";
import { LINK_DAYS, sealConversation } from "@/lib/conversation-token";
import { ApiError, handleError, json, readJson } from "@/lib/http";
import { resolveProfile } from "@/lib/profiles";

type Ctx = { params: Promise<{ id: string; sessionId: string }> };

// A read-only link to one conversation, minted for its owner only. It opens for a signed-in member
// of the same workspace and expires after LINK_DAYS (see conversation-token.ts).
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id, sessionId } = await params;
    const { user, row } = await requireAgentAccess(id);
    if (!/^[\w.-]{1,128}$/.test(sessionId)) throw new ApiError(404, "not_found", "Conversation introuvable.");
    const profile = await resolveProfile(row, new URL(request.url).searchParams.get("profile"));
    const { title } = await readJson<{ title?: string }>(request);
    const token = sealConversation({
      w: row.workspace_id,
      a: id,
      p: profile,
      s: sessionId,
      t: (title ?? "").trim().slice(0, 200),
      o: (user.firstName ?? user.name ?? "").slice(0, 80),
      e: Math.floor(Date.now() / 1000) + LINK_DAYS * 24 * 60 * 60,
    });
    if (!token) throw new ApiError(501, "share_off", "Le partage de conversation n’est pas encore activé sur cet espace. Contactez Yelema.");
    return json({ path: `/conversations/partagee?c=${token}`, days: LINK_DAYS });
  } catch (e) {
    return handleError(e);
  }
}
