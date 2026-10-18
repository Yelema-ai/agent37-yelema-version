import { NextResponse } from "next/server";
import { backoffice, type BoMe } from "@/lib/backoffice";
import { handleError } from "@/lib/http";
import { rememberPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { profile, token } from "../_shared";

// `PUT /api/account/avatar` — the signed-in user's own photo (multipart, field `file`), relayed as
// it came: the back office checks the file's real type and its size, and keeps it. `DELETE` goes
// back to the initial. Needs the back office's `/app/me/avatar`; until it exists, the member reads
// the usual "try again" sentence.
async function answer(t: string, me: BoMe) {
  const workspace = await pinnedWorkspaceId();
  if (workspace) rememberPrincipal(workspace, t, me);
  return NextResponse.json(profile(me.user), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  try {
    const t = await token();
    return await answer(t, await backoffice.setMyAvatar(t, await request.formData()));
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE() {
  try {
    const t = await token();
    return await answer(t, await backoffice.removeMyAvatar(t));
  } catch (e) {
    return handleError(e);
  }
}
