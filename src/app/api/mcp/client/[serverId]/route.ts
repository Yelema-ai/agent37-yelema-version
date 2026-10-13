import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../../_shared";

type Ctx = { params: Promise<{ serverId: string }> };

// `DELETE /api/mcp/client/{serverId}` — an admin removes one of the company's tool servers.
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { serverId } = await params;
    return noStore(await backoffice.removeMcpServer(await settingsToken(), { kind: "client" }, serverId));
  } catch (e) {
    return mcpError(e);
  }
}
