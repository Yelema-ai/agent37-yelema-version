import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { modelChoiceRefusal, parseModelChoice } from "@/lib/llm";
import { noStore, settingsError, settingsToken } from "../../_shared";

// `PUT /api/llm/own/model` — the model the signed-in user picks among Yelema's own, for their
// instance or one of their experts. The back office holds the list, checks the pick against it and
// installs it; the app passes it on and writes nothing on an instance.
export async function PUT(request: Request) {
  try {
    const choice = parseModelChoice(await readJson(request));
    if (!choice) throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
    return noStore(await backoffice.setLlmModel(await settingsToken(), choice));
  } catch (e) {
    return settingsError(e, modelChoiceRefusal);
  }
}
