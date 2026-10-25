import { agent37 } from "@/lib/agent37";
import { requireMember, requireUser } from "@/lib/auth";
import { cleanReply } from "@/lib/chat-errors";
import { openConversation } from "@/lib/conversation-token";
import { expertDisplayName } from "@/lib/experts";
import { ApiError, handleError, json } from "@/lib/http";
import { DEFAULT_PROFILE, profileQuery } from "@/lib/profiles";

// A conversation shared by its owner, read-only: any signed-in member of the same workspace who has
// the link reads it, nobody else (404, so a link says nothing outside the company). The instance is
// read with the workspace key, as the token was sealed by the owner of that instance.
export async function GET(request: Request) {
  try {
    const claims = openConversation(new URL(request.url).searchParams.get("c"));
    if (!claims) throw new ApiError(404, "not_found", "Ce lien n’ouvre plus de conversation : il a expiré ou il est incomplet.");
    const { db, user } = await requireUser();
    await requireMember(db, claims.w, user.id);

    const detail = await agent37.getSession(claims.a, claims.s, profileQuery(claims.p));
    const messages = (detail.history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ id: m.id, role: m.role, at: m.created_at, content: m.role === "assistant" ? cleanReply(m.content ?? "") : (m.content ?? "").trim() }))
      .filter((m) => m.content);
    return json({
      title: claims.t || "Conversation",
      owner: claims.o,
      expert: claims.p === DEFAULT_PROFILE ? "L’assistant" : expertDisplayName(claims.p),
      expiresAt: claims.e * 1000,
      messages,
    });
  } catch (e) {
    return handleError(e);
  }
}
