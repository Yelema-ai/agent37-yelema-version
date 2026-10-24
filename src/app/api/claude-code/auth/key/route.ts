import { backoffice } from "@/lib/backoffice";
import { CREDENTIAL_ID_RE } from "@/lib/claude-code-auth";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsToken } from "../../../llm/_shared";
import { claudeAuthError, memberOf } from "../_shared";

// `PUT|DELETE /api/claude-code/auth/key` — un compte de modèle (clé API ou jeton d'abonnement) ajouté, ou retiré (`?id=`).
export async function PUT(request: Request) {
  try {
    const body = ((await readJson(request)) ?? {}) as { key?: unknown; label?: unknown };
    const key = String(body.key ?? "").trim();
    if (!key || key.length > 400) throw new ApiError(400, "bad_request", "Collez une clé API ou un jeton d’abonnement.");
    const label = typeof body.label === "string" && body.label.trim() ? body.label.trim().slice(0, 60) : null;
    return noStore(await backoffice.putClaudeKey(await settingsToken(), memberOf(request), key, label));
  } catch (e) {
    return claudeAuthError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id !== null && !CREDENTIAL_ID_RE.test(id)) throw new ApiError(404, "not_found", "Ce compte est introuvable.");
    return noStore(await backoffice.deleteClaudeKey(await settingsToken(), memberOf(request), id));
  } catch (e) {
    return claudeAuthError(e);
  }
}
