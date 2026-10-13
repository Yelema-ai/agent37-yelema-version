import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { parseLoginDraft, safeVerificationUrl, type LlmLoginView, type SettingScope } from "@/lib/llm";
import { noStore, settingsError, settingsToken } from "./_shared";

// The address the member is about to open was written by an instance: it goes to the browser only
// as an https page, with the code and the deadline, and nothing else the back office may add.
function view(v: LlmLoginView) {
  const url = safeVerificationUrl(v.verificationUrl);
  return noStore(v.status === "pending" && url ? { status: v.status, verificationUrl: url, userCode: v.userCode, expiresAt: v.expiresAt } : { status: v.status === "pending" ? "error" : v.status });
}

export async function startLogin(request: Request, scope: SettingScope) {
  try {
    const draft = parseLoginDraft(await readJson(request));
    if (!draft) throw new ApiError(400, "bad_request", "Indiquez le modèle que vos experts utiliseront.");
    return view(await backoffice.startLlmLogin(await settingsToken(), scope, draft));
  } catch (e) {
    return settingsError(e);
  }
}

export async function readLogin(scope: SettingScope) {
  try {
    return view(await backoffice.llmLogin(await settingsToken(), scope));
  } catch (e) {
    return settingsError(e);
  }
}
