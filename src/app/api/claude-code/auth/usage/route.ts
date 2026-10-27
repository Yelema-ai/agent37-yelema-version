import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken } from "../../../llm/_shared";
import { claudeAuthError, memberOf } from "../_shared";

// `GET /api/claude-code/auth/usage` — consommation du mois relevée sur l'instance (mesure, pas facture).
export async function GET(request: Request) {
  try {
    return noStore(await backoffice.claudeUsage(await settingsToken(), memberOf(request)));
  } catch (e) {
    return claudeAuthError(e);
  }
}
