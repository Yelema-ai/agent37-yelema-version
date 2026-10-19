import { NextResponse } from "next/server";
import { backoffice, type MePatch } from "@/lib/backoffice";
import { ApiError, handleError, readJson } from "@/lib/http";
import { currentPrincipal, rememberPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { profile, token } from "./_shared";

// `GET|PATCH /api/account` — the signed-in user's own profile (first name, last name, job title, photo, call voices),
// kept by the back office. Its full name is computed there from the first two.
const noStore = (data: unknown) => NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });

export async function GET() {
  try {
    await token();
    const me = await currentPrincipal();
    if (!me) throw new ApiError(401, "unauthorized", "Connectez-vous pour continuer.");
    return noStore(profile(me.user));
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    const t = await token();
    const body = await readJson(request);
    const patch: MePatch = {};
    for (const k of ["firstName", "lastName", "jobTitle"] as const) if (typeof body[k] === "string") patch[k] = body[k] as string;
    // Checked by the back office (scope, language, a voice of that language).
    if (body.voices && typeof body.voices === "object" && !Array.isArray(body.voices)) patch.voices = body.voices as MePatch["voices"];
    const me = await backoffice.updateMe(t, patch);
    const workspace = await pinnedWorkspaceId();
    if (workspace) rememberPrincipal(workspace, t, me);
    return noStore(profile(me.user));
  } catch (e) {
    return handleError(e);
  }
}
