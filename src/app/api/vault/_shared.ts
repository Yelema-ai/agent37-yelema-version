import { ApiError, readJson } from "@/lib/http";
import { parseVaultDraft, vaultRefusalMessage, type VaultDraft } from "@/lib/vault";
import { settingsError } from "../llm/_shared";

export { noStore, settingsToken } from "../llm/_shared";

export async function vaultDraft(request: Request): Promise<VaultDraft> {
  const draft = parseVaultDraft(await readJson(request));
  if (!draft) throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
  return draft;
}

// Un refus du back-office arrive au membre en une phrase écrite dans src/lib/vault.ts.
export const vaultError = (e: unknown) => settingsError(e, vaultRefusalMessage);
