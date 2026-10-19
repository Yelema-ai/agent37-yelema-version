import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../_shared";

export const maxDuration = 120;

// `GET /api/mcp/oauth` — the OAuth servers of the signed-in user's own instance, authorized or not.
// `DELETE` — drops the authorization in progress there.
export async function GET() {
  try {
    return noStore(await backoffice.mcpOauth(await settingsToken()));
  } catch (e) {
    return mcpError(e);
  }
}

export async function DELETE() {
  try {
    return noStore(await backoffice.cancelMcpOauth(await settingsToken()));
  } catch (e) {
    return mcpError(e);
  }
}
