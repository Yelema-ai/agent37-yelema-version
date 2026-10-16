import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { isAccountId, parseAccountPatch } from "@/lib/llm-accounts";
import { noStore, settingsError, settingsToken } from "../../_shared";

// `GET|PATCH|DELETE /api/llm/accounts/{accountId}` — one account: where its sign-in stands, its name
// or key, its removal. The back office checks the caller may touch it.
type Ctx = { params: Promise<{ accountId: string }> };

async function idOf(ctx: Ctx): Promise<string> {
  const { accountId } = await ctx.params;
  if (!isAccountId(accountId)) throw new ApiError(404, "not_found", "Ce compte est introuvable.");
  return accountId;
}

export async function GET(_request: Request, ctx: Ctx) {
  try {
    return noStore(await backoffice.llmAccount(await settingsToken(), await idOf(ctx)));
  } catch (e) {
    return settingsError(e);
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    const patch = parseAccountPatch(await readJson(request));
    if (!patch) throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
    return noStore(await backoffice.patchLlmAccount(await settingsToken(), await idOf(ctx), patch));
  } catch (e) {
    return settingsError(e);
  }
}

export async function DELETE(_request: Request, ctx: Ctx) {
  try {
    return noStore(await backoffice.removeLlmAccount(await settingsToken(), await idOf(ctx)));
  } catch (e) {
    return settingsError(e);
  }
}
