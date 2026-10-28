import { requireAgentAccess } from "@/lib/auth";
import { routinesOf } from "@/lib/routine-store";
import { handleError, json, readJson } from "@/lib/http";
import { routineExpert, routineFields, type RoutineBody } from "./_body";

// Each call reads the instance's key file and talks to Hermes's API server on the instance.
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

// An expert's routines (?expert=<profile>): its own suggestions, paused until turned on, and the
// ones the member or the expert created.
export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { row } = await requireAgentAccess(id);
    const [expert, store] = await Promise.all([routineExpert(row, new URL(request.url).searchParams.get("expert"), { skills: false }), routinesOf(id)]);
    return json({ routines: await store.list(id, expert.profile, expert.name) });
  } catch (e) {
    return handleError(e);
  }
}

// "Nouvelle routine": { expert, name, task, skills, attachment, schedule }.
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { row } = await requireAgentAccess(id);
    const body = await readJson<RoutineBody>(request);
    const [expert, store] = await Promise.all([routineExpert(row, body.expert), routinesOf(id)]);
    const routine = await store.create(id, expert.profile, expert.name, routineFields(body, expert));
    return json({ routine }, 201);
  } catch (e) {
    return handleError(e);
  }
}
