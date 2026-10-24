import { backoffice } from "@/lib/backoffice";
import { CREDENTIAL_ID_RE } from "@/lib/claude-code-auth";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsToken } from "../../../llm/_shared";
import { claudeAuthError, memberOf } from "../_shared";

// `PUT /api/claude-code/auth/order { ids }` — l'ordre dans lequel les comptes de modèle servent.
export async function PUT(request: Request) {
  try {
    const raw = ((await readJson(request)) as { ids?: unknown } | null)?.ids;
    const ids = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string" && CREDENTIAL_ID_RE.test(x)) : [];
    if (!ids.length || ids.length > 10) throw new ApiError(400, "bad_request", "Liste des comptes attendue.");
    return noStore(await backoffice.orderClaudeKeys(await settingsToken(), memberOf(request), ids));
  } catch (e) {
    return claudeAuthError(e);
  }
}
