import { backoffice, type MemberPrefs } from "@/lib/backoffice";
import { handleError, json, readJson } from "@/lib/http";
import { noStore } from "../../mail/_session";
import { token } from "../_shared";

// `GET|PUT /api/account/preferences` — pinned/archived conversations and notification kinds, kept by
// the back office so they follow the member across devices. It checks the shape.
export async function GET() {
  try {
    return noStore(json(await backoffice.preferences(await token())));
  } catch (e) {
    return handleError(e);
  }
}

export async function PUT(request: Request) {
  try {
    const t = await token();
    const body = await readJson(request);
    const patch: Partial<MemberPrefs> = {};
    if (body.chatMarks !== undefined) patch.chatMarks = body.chatMarks as MemberPrefs["chatMarks"];
    if (body.notify !== undefined) patch.notify = body.notify as MemberPrefs["notify"];
    return noStore(json(await backoffice.setPreferences(t, patch)));
  } catch (e) {
    return handleError(e);
  }
}
