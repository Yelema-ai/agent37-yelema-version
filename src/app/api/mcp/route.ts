import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "./_shared";

// `GET /api/mcp` — the signed-in user's own tool servers, and for an admin the company's and each
// member's. Read from the back office on every call: a server being written must show as such.
// Never a token: only its last four characters.
export async function GET() {
  try {
    return noStore(await backoffice.mcp(await settingsToken()));
  } catch (e) {
    return mcpError(e);
  }
}
