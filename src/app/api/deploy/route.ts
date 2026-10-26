import { backoffice } from "@/lib/backoffice";
import { authViaBackoffice, backofficeUrl, deployVersion } from "@/lib/runtime-config";

// What an open page polls to tell the member about an update: whether one is running (the back
// office's switch) and which deployment answers. Secret-free, behind the session like any page. A back
// office that does not answer, or does not have the route yet, means "no update running".
export const dynamic = "force-dynamic";

export async function GET() {
  let maintenance = false;
  if (authViaBackoffice() && backofficeUrl()) {
    try {
      maintenance = (await backoffice.platformStatus())?.maintenance === true;
    } catch {
      // Silent on purpose: never a banner on a guess.
    }
  }
  return Response.json({ version: deployVersion(), maintenance }, { headers: { "Cache-Control": "no-store" } });
}
