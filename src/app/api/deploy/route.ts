import { backoffice } from "@/lib/backoffice";
import { memo } from "@/lib/memo";
import { authViaBackoffice, backofficeUrl, deployVersion } from "@/lib/runtime-config";
import { pinnedWorkspaceId } from "@/lib/tenant";

// What an open page polls to tell the member about an update: whether one is running (the back
// office's switch) and which deployment answers. Secret-free, behind the session like any page. A back
// office that does not answer, or does not have the route yet, means "no update running".
export const dynamic = "force-dynamic";

// The same answer for every member of a client: asked once per 30 s per process.
const statuses = memo<boolean>({ ttlMs: 30_000, maxEntries: 500, maxFlightMs: 6_000 });

export async function GET() {
  let maintenance = false;
  if (authViaBackoffice() && backofficeUrl()) {
    try {
      const workspace = (await pinnedWorkspaceId()) ?? "";
      maintenance = await statuses.get(workspace, async () => (await backoffice.platformStatus())?.maintenance === true);
    } catch {
      // Silent on purpose: never a banner on a guess.
    }
  }
  return Response.json({ version: deployVersion(), maintenance }, { headers: { "Cache-Control": "no-store" } });
}
