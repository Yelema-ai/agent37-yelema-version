import { ApiError, readJson } from "@/lib/http";
import { parseUnipileDraft, unipileRefusalMessage, type UnipileDraft } from "@/lib/unipile";
import { settingsError } from "../llm/_shared";

export { noStore, settingsToken } from "../llm/_shared";

export async function unipileDraft(request: Request): Promise<UnipileDraft> {
  const draft = parseUnipileDraft(await readJson(request));
  if (!draft) throw new ApiError(400, "bad_request", "Renseignez le DSN, la clé d’API et au moins un Expert.");
  return draft;
}

export const unipileError = (e: unknown) => settingsError(e, unipileRefusalMessage);
