import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsToken } from "../../../llm/_shared";
import { claudeAuthError, memberOf } from "../_shared";

// `PUT|DELETE /api/claude-code/auth/key` — une clé API Anthropic posée sur l'instance, ou retirée.
export async function PUT(request: Request) {
  try {
    const key = String(((await readJson(request)) as { key?: unknown } | null)?.key ?? "").trim();
    if (!key || key.length > 400) throw new ApiError(400, "bad_request", "Collez une clé API Anthropic.");
    return noStore(await backoffice.putClaudeKey(await settingsToken(), memberOf(request), key));
  } catch (e) {
    return claudeAuthError(e);
  }
}

export async function DELETE(request: Request) {
  try {
    return noStore(await backoffice.deleteClaudeKey(await settingsToken(), memberOf(request)));
  } catch (e) {
    return claudeAuthError(e);
  }
}
