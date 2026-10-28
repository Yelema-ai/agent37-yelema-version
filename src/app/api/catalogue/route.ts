import { requireMember, requireUser } from "@/lib/auth";
import { ApiError, handleError, json } from "@/lib/http";
import { catalogueWithInstalled, visibleAgents } from "@/lib/installed-experts";
import type { CatalogueResponse } from "@/lib/types";

// `GET /api/catalogue?workspace={id}` — every expert Yelema offers, with where each one is
// installed for this user. The gallery reads it: an installed expert opens its chat, the others
// are shown as not yet in the team (adding one is a back-office action, not this app's).
export async function GET(request: Request) {
  try {
    const { db, user } = await requireUser();
    const workspaceId = new URL(request.url).searchParams.get("workspace");
    if (!workspaceId) throw new ApiError(400, "invalid_request", "Demande incomplète.");

    await requireMember(db, workspaceId, user.id);
    return json<CatalogueResponse>(await catalogueWithInstalled(await visibleAgents(db, workspaceId, user.id)));
  } catch (e) {
    return handleError(e);
  }
}
