import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, unipileDraft, unipileError } from "../_shared";

// `POST /api/unipile/test` — le DSN et la clé essayés sur l'instance, rien n'est gardé.
export async function POST(request: Request) {
  try {
    return noStore(await backoffice.testUnipile(await settingsToken(), await unipileDraft(request)));
  } catch (e) {
    return unipileError(e);
  }
}
