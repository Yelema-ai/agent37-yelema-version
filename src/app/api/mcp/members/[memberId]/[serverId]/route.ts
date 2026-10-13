import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../../../_shared";

type Ctx = { params: Promise<{ memberId: string; serverId: string }> };

// `DELETE /api/mcp/members/{memberId}/{serverId}` — an admin removes one of a member's tool servers.
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { memberId, serverId } = await params;
    return noStore(await backoffice.removeMcpServer(await settingsToken(), { kind: "member", id: memberId }, serverId));
  } catch (e) {
    return mcpError(e);
  }
}
