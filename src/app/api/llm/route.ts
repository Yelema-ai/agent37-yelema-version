import { backoffice } from "@/lib/backoffice";
import { noStore, settingsError, settingsToken } from "./_shared";

// `GET /api/llm` — where the signed-in user's model comes from, their own key, and for an admin the
// company's key and each member's source. Read from the back office on every call: a key being
// installed must show as such. Never a key: only its last four characters.
export async function GET() {
  try {
    return noStore(await backoffice.llm(await settingsToken()));
  } catch (e) {
    return settingsError(e);
  }
}
