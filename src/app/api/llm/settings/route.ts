import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { noStore, settingsError, settingsToken } from "../_shared";

// `PUT /api/llm/settings` — an admin lets the members bring their own model key, or stops it.
export async function PUT(request: Request) {
  try {
    const { membersMayBringKey } = await readJson<{ membersMayBringKey?: unknown }>(request);
    if (typeof membersMayBringKey !== "boolean") throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
    return noStore(await backoffice.setLlmSettings(await settingsToken(), { membersMayBringKey }));
  } catch (e) {
    return settingsError(e);
  }
}
