import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken } from "../../llm/_shared";
import { claudeAuthError, isNotClaudeCode, memberOf } from "./_shared";

// `GET|POST|DELETE /api/claude-code/auth` — le modèle d'une instance Claude Code : état, connexion de
// l'abonnement, déconnexion. Une instance sous un autre moteur répond `{ unsupported: true }`.
export async function GET(request: Request) {
  try {
    return noStore(await backoffice.claudeAuth(await settingsToken(), memberOf(request)));
  } catch (e) {
    return isNotClaudeCode(e) ? noStore({ unsupported: true }) : claudeAuthError(e);
  }
}

export async function POST(request: Request) {
  try {
    return noStore(await backoffice.startClaudeAuth(await settingsToken(), memberOf(request)));
  } catch (e) {
    return claudeAuthError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    return noStore(await backoffice.logoutClaudeAuth(await settingsToken(), memberOf(request)));
  } catch (e) {
    return claudeAuthError(e);
  }
}
