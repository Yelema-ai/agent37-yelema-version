import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, serverDraft, settingsToken } from "../../_shared";

type Ctx = { params: Promise<{ memberId: string }> };

// `POST /api/mcp/members/{memberId}` — a tool server for one member, added by an admin. The back
// office answers 404 to anyone else, and to an id that is not a member of this workspace.
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { memberId } = await params;
    return noStore(await backoffice.addMcpServer(await settingsToken(), { kind: "member", id: memberId }, await serverDraft(request)));
  } catch (e) {
    return mcpError(e);
  }
}
