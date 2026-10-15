import { backoffice } from "@/lib/backoffice";
import { expertLookRefusal, expertName, EXPERT_NAME_RULE } from "@/lib/expert-looks";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsError, settingsToken } from "../../llm/_shared";

type Ctx = { params: Promise<{ key: string }> };

// `GET /api/experts/{key}` — the member's own name and picture for an expert of their team, over the
// catalogue's. `PATCH` renames it (`displayName`, or null for its own name); the back office writes
// the name in the expert's SOUL.md, so it introduces itself that way in the chat and on the phone.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    return noStore(await backoffice.expertLook(await settingsToken(), key));
  } catch (e) {
    return settingsError(e, expertLookRefusal);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { key } = await params;
    const token = await settingsToken();
    const { displayName } = await readJson<{ displayName?: unknown }>(request);
    const name = displayName === null ? null : expertName(displayName);
    if (displayName !== null && !name) throw new ApiError(400, "bad_request", `Ce nom ne convient pas. ${EXPERT_NAME_RULE}`);
    return noStore(await backoffice.renameExpert(token, key, name));
  } catch (e) {
    return settingsError(e, expertLookRefusal);
  }
}
