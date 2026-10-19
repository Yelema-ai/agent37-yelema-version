import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { parseOauthQuery } from "@/lib/mcp-servers";
import { mcpError, noStore, settingsToken } from "../../_shared";

export const maxDuration = 120;

// `POST /api/mcp/oauth/callback` — the return page relays what the provider sent the browser. It
// goes to the authorization in progress on the user's own instance, where Hermes checks `state`.
export async function POST(request: Request) {
  try {
    const query = parseOauthQuery(await readJson(request));
    if (!query) throw new ApiError(400, "bad_callback", "Le retour du fournisseur est incomplet. Relancez l’autorisation.");
    return noStore(await backoffice.finishMcpOauth(await settingsToken(), query));
  } catch (e) {
    return mcpError(e);
  }
}
