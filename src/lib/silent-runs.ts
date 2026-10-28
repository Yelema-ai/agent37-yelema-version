import { agent37 } from "@/lib/agent37";
import { routineOfSession, runOutcome, type RunOutcome } from "@/lib/routines";
import type { SessionSummary } from "@/lib/types";

// A routine run that had nothing to report is a notification, not a conversation (Leslie, 28/10:
// « si y'a vraiment rien à signaler, plus intelligent de ne pas créer tout un chat, juste une notif »).
// Hermes keeps no outcome on its session list, so a finished run is read once for its last answer;
// a finished run never changes, so the outcome is kept for the life of the server.
const known = new Map<string, RunOutcome>();
const MAX_READS = 30;

const finished = (s: SessionSummary) => s.message_count == null || s.message_count >= 2;

/** The ids of the routine runs among `sessions` that answered [SILENT]. */
export async function silentRunIds(agentId: string, profileQuery: string, sessions: SessionSummary[]): Promise<Set<string>> {
  const runs = sessions
    .filter((s) => finished(s) && routineOfSession(s) !== null)
    .sort((a, b) => (b.last_active ?? b.started_at ?? 0) - (a.last_active ?? a.started_at ?? 0));
  const unread = runs.filter((s) => !known.has(`${agentId}|${s.id}`)).slice(0, MAX_READS);
  await Promise.all(
    unread.map(async (s) => {
      try {
        const { history, active_response_id } = await agent37.getSession(agentId, s.id, profileQuery);
        if (active_response_id) return;
        const last = history.findLast((m) => m.role === "assistant");
        known.set(`${agentId}|${s.id}`, runOutcome(last?.content ?? null));
      } catch {
        // Unread for now: shown as a conversation, asked again next time.
      }
    })
  );
  return new Set(runs.filter((s) => known.get(`${agentId}|${s.id}`) === "silent").map((s) => s.id));
}
