import { backoffice } from "@/lib/backoffice";
import { handleError, json } from "@/lib/http";
import { billingToken } from "../billing/_admin";
import { usageFilter, volumesOnly } from "./_filter";

// `GET /api/composio-usage?from=&to=&member=` — how many tool calls the workspace's experts made over
// a period, in all, by member and by application, for its admins. Read from the back office, which
// records and prices every execution; the price stays here, the client sees volumes only.
export async function GET(request: Request) {
  try {
    const token = await billingToken();
    const res = json(volumesOnly(await backoffice.composioUsage(token, usageFilter(new URL(request.url)))));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    return handleError(e);
  }
}
