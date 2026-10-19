import { backoffice } from "@/lib/backoffice";
import { mcpError, noStore, settingsToken } from "../../_shared";

export const maxDuration = 120;

type Ctx = { params: Promise<{ serverId: string }> };

// `POST /api/mcp/oauth/{serverId}` — starts the authorization on the user's own instance; answers the provider's URL.
export async function POST(_request: Request, { params }: Ctx) {
  try {
    const { serverId } = await params;
    return noStore(await backoffice.startMcpOauth(await settingsToken(), serverId));
  } catch (e) {
    return mcpError(e);
  }
}
