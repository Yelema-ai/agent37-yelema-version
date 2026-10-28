import { agent37 } from "@/lib/agent37";
import { runOutcome } from "@/lib/routines";
import { runOutcomes } from "@/lib/run-outcomes";

// A routine run with nothing to report is a notification, not a conversation. The gateway knows each
// run's outcome; direct to Agent37, a few runs are read per request (lib/run-outcomes).
export const silentRunIds = runOutcomes({
  batch: (agentId, profileQuery, ids) => agent37.routineOutcomes(agentId, ids, profileQuery),
  one: async (agentId, sessionId, profileQuery) => {
    const { history, active_response_id } = await agent37.getSession(agentId, sessionId, profileQuery);
    if (active_response_id) return null;
    return runOutcome(history.findLast((m) => m.role === "assistant")?.content ?? null);
  },
});
