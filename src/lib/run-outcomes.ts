import { routineOfSession, type RunOutcome } from "./routines.ts";
import type { SessionSummary } from "./types.ts";

// What finished routine runs came to, known per process. Pure: the readers are injected, so it is tested.
export type OutcomeReaders = {
  /** The gateway's outcomes of these runs; `null` when there is no gateway (direct Agent37). */
  batch: (agentId: string, profileQuery: string, ids: string[]) => Promise<Record<string, RunOutcome> | null>;
  /** One run read directly; `null` while it still runs. */
  one: (agentId: string, sessionId: string, profileQuery: string) => Promise<RunOutcome | null>;
};

/** Direct reads left for one request, shared by every profile it covers. */
export type ReadBudget = { left: number };

export const BATCH_MAX = 60;
export const DIRECT_READS = 5;
const MEMO_MAX = 2000;
const FAILURE_TTL_MS = 5 * 60_000;

const finished = (s: SessionSummary) => s.message_count == null || s.message_count >= 2;

function remember<V>(map: Map<string, V>, key: string, value: V, max: number) {
  map.delete(key);
  map.set(key, value);
  if (map.size > max) map.delete(map.keys().next().value as string);
}

export function runOutcomes(readers: OutcomeReaders, { memoMax = MEMO_MAX, now = Date.now } = {}) {
  const known = new Map<string, RunOutcome>();
  const failedUntil = new Map<string, number>();

  async function direct(agentId: string, profileQuery: string, ids: string[], budget: ReadBudget) {
    const due = ids.filter((id) => (failedUntil.get(`${agentId}|${id}`) ?? 0) <= now());
    const take = due.slice(0, Math.max(0, budget.left));
    budget.left -= take.length;
    await Promise.all(
      take.map(async (id) => {
        const key = `${agentId}|${id}`;
        try {
          const outcome = await readers.one(agentId, id, profileQuery);
          if (outcome) remember(known, key, outcome, memoMax);
        } catch {
          remember(failedUntil, key, now() + FAILURE_TTL_MS, memoMax);
        }
      })
    );
  }

  /** The ids of the finished routine runs among `sessions` that answered [SILENT]. */
  return async function silentRunIds(agentId: string, profileQuery: string, sessions: SessionSummary[], budget: ReadBudget = { left: DIRECT_READS }): Promise<Set<string>> {
    const runs = sessions
      .filter((s) => finished(s) && routineOfSession(s) !== null)
      .sort((a, b) => (b.last_active ?? b.started_at ?? 0) - (a.last_active ?? a.started_at ?? 0));
    const unknown = runs.filter((s) => !known.has(`${agentId}|${s.id}`)).map((s) => s.id).slice(0, BATCH_MAX);
    if (unknown.length) {
      try {
        const got = await readers.batch(agentId, profileQuery, unknown);
        if (got === null) await direct(agentId, profileQuery, unknown, budget);
        else for (const id of unknown) {
          const o = got[id];
          if (o === "sent" || o === "silent" || o === "failed") remember(known, `${agentId}|${id}`, o, memoMax);
        }
      } catch {
        // Gateway unreachable: shown as conversations, asked again next time.
      }
    }
    return new Set(runs.filter((s) => known.get(`${agentId}|${s.id}`) === "silent").map((s) => s.id));
  };
}
