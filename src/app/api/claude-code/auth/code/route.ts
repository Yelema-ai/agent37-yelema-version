import { backoffice } from "@/lib/backoffice";
import { CLAUDE_CODE_RE } from "@/lib/claude-code-auth";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsToken } from "../../../llm/_shared";
import { claudeAuthError, memberOf } from "../_shared";

// `POST /api/claude-code/auth/code` — le code que claude.ai affiche, remis à la connexion en cours.
export async function POST(request: Request) {
  try {
    const code = String(((await readJson(request)) as { code?: unknown } | null)?.code ?? "").trim();
    if (!CLAUDE_CODE_RE.test(code)) throw new ApiError(400, "bad_request", "Copiez le code en entier depuis la page de Claude.");
    return noStore(await backoffice.submitClaudeCode(await settingsToken(), memberOf(request), code));
  } catch (e) {
    return claudeAuthError(e);
  }
}
