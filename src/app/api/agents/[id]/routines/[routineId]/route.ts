import { requireAgentAccess } from "@/lib/auth";
import { routinesOf } from "@/lib/routine-store";
import { handleError, json, readJson } from "@/lib/http";
import { routineExpert, routineFields, type RoutineBody } from "../_body";

export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string; routineId: string }> };

// { expert, enabled } turns a routine on or off; { expert, name, task, skills, attachment, schedule }
// edits it.
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id, routineId } = await params;
    const { row } = await requireAgentAccess(id);
    const body = await readJson<RoutineBody>(request);
    const expert = await routineExpert(row, body.expert);
    const routine =
      typeof body.enabled === "boolean"
        ? await (await routinesOf(id)).setEnabled(id, expert.profile, expert.name, routineId, body.enabled)
        : await (await routinesOf(id)).update(id, expert.profile, expert.name, routineId, routineFields(body, expert));
    return json({ routine });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(request: Request, { params }: Ctx) {
  try {
    const { id, routineId } = await params;
    const { row } = await requireAgentAccess(id);
    const expert = await routineExpert(row, new URL(request.url).searchParams.get("expert"));
    await (await routinesOf(id)).remove(id, expert.profile, routineId);
    return json({ id: routineId, deleted: true });
  } catch (e) {
    return handleError(e);
  }
}
