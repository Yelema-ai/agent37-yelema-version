import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../../_shared";

export const maxDuration = 120;

// `POST /api/mcp/tools/refresh` — surveys the user's own instance again (six times an hour at most).
export async function POST() {
  try {
    return noStore(await backoffice.refreshMcpTools(await settingsToken()));
  } catch (e) {
    return mcpError(e);
  }
}
