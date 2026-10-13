import { backoffice } from "@/lib/backoffice";
import { keyDraft, noStore, settingsError, settingsToken } from "../_shared";

// `PUT|DELETE /api/llm/client` — the model key of the whole company, for its admins. The
// back office checks the key with its provider, keeps it and installs it; the app passes it on and
// writes nothing on an instance.
export async function PUT(request: Request) {
  try {
    return noStore(await backoffice.setLlmKey(await settingsToken(), { kind: "client" }, await keyDraft(request)));
  } catch (e) {
    return settingsError(e);
  }
}

export async function DELETE() {
  try {
    return noStore(await backoffice.removeLlmKey(await settingsToken(), { kind: "client" }));
  } catch (e) {
    return settingsError(e);
  }
}
