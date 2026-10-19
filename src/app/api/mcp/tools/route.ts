import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../_shared";

// `GET /api/mcp/tools` — the last survey of what each tool server of the user's instance exposes
// (an admin also gets each member's). Surveyed on the instance by the back office; the app calls no server.
export async function GET() {
  try {
    return noStore(await backoffice.mcpTools(await settingsToken()));
  } catch (e) {
    return mcpError(e);
  }
}
