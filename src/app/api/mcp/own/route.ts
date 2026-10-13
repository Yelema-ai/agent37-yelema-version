import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, serverDraft, settingsToken } from "../_shared";

// `POST /api/mcp/own` — a tool server for the signed-in user's own instance. The back office lets
// an admin do it always, and a member only when their admin opened it.
export async function POST(request: Request) {
  try {
    return noStore(await backoffice.addMcpServer(await settingsToken(), { kind: "own" }, await serverDraft(request)));
  } catch (e) {
    return mcpError(e);
  }
}
