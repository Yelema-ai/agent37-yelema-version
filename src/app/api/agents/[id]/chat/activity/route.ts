import { agent37 } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { ApiError, handleError, json } from "@/lib/http";
import { profileQuery, resolveProfile } from "@/lib/profiles";
import { routineOfSession } from "@/lib/routines";
import type { RoutineSession } from "@/lib/activity";
import { DIRECT_READS } from "@/lib/run-outcomes";
import { silentRunIds } from "@/lib/silent-runs";

type Ctx = { params: Promise<{ id: string }> };

const MAX_PROFILES = 30;
const PER_PROFILE = 20;

// The latest routine runs of several experts of one instance (?profiles=a,b), in one call: the
// app polls it to announce finished runs. A profile that cannot be read is left out, not fatal.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { row } = await requireAgentAccess(id);
    const asked = [...new Set((new URL(request.url).searchParams.get("profiles") ?? "").split(",").filter(Boolean))];
    if (asked.length > MAX_PROFILES) throw new ApiError(400, "invalid_request", "Trop d’experts demandés.");

    // Without a gateway, the few direct reads allowed are shared by every profile asked.
    const budget = { left: DIRECT_READS };
    const entries = await Promise.all(
      asked.map(async (raw): Promise<[string, RoutineSession[]] | null> => {
        try {
          const profile = await resolveProfile(row, raw);
          const query = profileQuery(profile);
          const { data } = await agent37.listSessions(id, query);
          const silent = await silentRunIds(id, query, data, budget);
          const runs = data
            .map((s) => ({ s, routine: routineOfSession(s) }))
            .filter((x): x is { s: (typeof data)[number]; routine: string } => x.routine !== null)
            .map(({ s, routine }) => ({ session_id: s.id, routine, last_active: s.last_active ?? s.started_at ?? 0, message_count: s.message_count ?? null, silent: silent.has(s.id) }))
            .sort((a, b) => b.last_active - a.last_active)
            .slice(0, PER_PROFILE);
          return [raw, runs];
        } catch {
          return null;
        }
      })
    );
    return json({ profiles: Object.fromEntries(entries.filter((e) => e !== null)) });
  } catch (e) {
    return handleError(e);
  }
}
