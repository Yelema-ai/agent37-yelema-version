import { backoffice } from "@/lib/backoffice";
import { keyDraft, noStore, settingsError, settingsToken } from "../../_shared";

type Ctx = { params: Promise<{ memberId: string }> };

// `PUT|DELETE /api/llm/members/{memberId}` — one member's model key, set by an admin. The back
// office answers 404 to anyone else, and to an id that is not a member of this workspace.
export async function PUT(request: Request, { params }: Ctx) {
  try {
    const { memberId } = await params;
    return noStore(await backoffice.setLlmKey(await settingsToken(), { kind: "member", id: memberId }, await keyDraft(request)));
  } catch (e) {
    return settingsError(e);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { memberId } = await params;
    return noStore(await backoffice.removeLlmKey(await settingsToken(), { kind: "member", id: memberId }));
  } catch (e) {
    return settingsError(e);
  }
}
