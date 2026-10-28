import { agent37 } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { handleError, json } from "@/lib/http";
import { profileQuery, resolveProfile } from "@/lib/profiles";
import { routineOfSession } from "@/lib/routines";
import { isVoiceSession } from "@/lib/voice-sessions";
import { silentRunIds } from "@/lib/silent-runs";

type Ctx = { params: Promise<{ id: string }> };

// The thread rail of one expert (?profile=), or of the instance's default home without it. The
// Agent37 Agents API is the source of truth — GET /v1/sessions lists every conversation of that
// profile (web chat and any other channel alike); there is no local index table. We resolve each rail label here as `title || preview` (the server-side title once set,
// otherwise the first-message preview the list already carries) and order most-recently-active
// first, so the client needs no per-session fetch to label the rail.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { row } = await requireAgentAccess(id);
    const profile = await resolveProfile(row, new URL(request.url).searchParams.get("profile"));

    const query = profileQuery(profile);
    const { data } = await agent37.listSessions(id, query);
    // A routine run shows once it has something to say (Leslie, 28/10): still running, or with nothing to
    // report, it is no conversation (the bell has the latter).
    const silent = await silentRunIds(id, query, data);
    const running = (s: (typeof data)[number]) => s.message_count != null && s.message_count < 2 && routineOfSession(s) !== null;
    const sessions = data
      .filter((s) => !isVoiceSession(s.preview) && !silent.has(s.id) && !running(s))
      .map((s) => ({
        session_id: s.id,
        title: s.title?.trim() || s.preview?.trim() || null,
        last_active: s.last_active ?? s.started_at ?? 0,
        // A routine's run, by the routine's name: shown as such, never as the member's own words.
        routine: routineOfSession(s),
      }))
      .sort((a, b) => b.last_active - a.last_active);

    return json({ sessions });
  } catch (e) {
    return handleError(e);
  }
}
