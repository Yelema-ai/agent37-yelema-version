import { agent37 } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { routinesOf } from "@/lib/routine-store";
import { handleError, json } from "@/lib/http";
import { profileQuery } from "@/lib/profiles";
import { isRunOf, runOutcome, type RoutineRun } from "@/lib/routines";
import { routineExpert } from "../../_body";

export const maxDuration = 120;

// Hermes keeps no run list on its API: a run is the conversation it opens (cron/scheduler.py names
// it after the routine), so the most recent ones are read for their last answer.
const MAX_RUNS = 20;

type Ctx = { params: Promise<{ id: string; routineId: string }> };

// "Historique" of a routine (?expert=<profile>): its past runs, newest first.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id, routineId } = await params;
    const { row } = await requireAgentAccess(id);
    const expert = await routineExpert(row, new URL(request.url).searchParams.get("expert"));
    const query = profileQuery(expert.profile);
    const [hermesName, { data }] = await Promise.all([(await routinesOf(id)).hermesName(id, expert.profile, routineId), agent37.listSessions(id, query)]);

    const sessions = data
      .filter((s) => isRunOf(s, { id: routineId, hermesName }))
      .map((s) => ({ id: s.id, at: toMs(s.last_active ?? s.started_at ?? 0) }))
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_RUNS);

    const runs: RoutineRun[] = await Promise.all(
      sessions.map(async (s) => {
        try {
          const { history } = await agent37.getSession(id, s.id, query);
          const last = history.findLast((m) => m.role === "assistant");
          return { sessionId: s.id, at: s.at, outcome: runOutcome(last?.content ?? null) };
        } catch {
          return { sessionId: s.id, at: s.at, outcome: null };
        }
      })
    );
    return json({ runs });
  } catch (e) {
    return handleError(e);
  }
}

// Hermes reports seconds, the gateway milliseconds.
const toMs = (t: number) => (t < 1e12 ? t * 1000 : t);
