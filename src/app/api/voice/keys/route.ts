import { backoffice } from "@/lib/backoffice";
import { voiceKeyRefusal } from "@/lib/voice-keys";
import { noStore, settingsError, settingsToken } from "../../llm/_shared";

// `GET /api/voice/keys` — the user's transcription keys (an admin's view adds the company's and each
// member's). Only their last four characters ever come back.
export async function GET() {
  try {
    return noStore(await backoffice.voiceKeys(await settingsToken()));
  } catch (e) {
    return settingsError(e, voiceKeyRefusal);
  }
}
