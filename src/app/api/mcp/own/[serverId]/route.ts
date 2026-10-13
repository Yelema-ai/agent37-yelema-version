import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../../_shared";

type Ctx = { params: Promise<{ serverId: string }> };

// `DELETE /api/mcp/own/{serverId}` — the signed-in user removes one of their own tool servers.
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { serverId } = await params;
    return noStore(await backoffice.removeMcpServer(await settingsToken(), { kind: "own" }, serverId));
  } catch (e) {
    return mcpError(e);
  }
}
