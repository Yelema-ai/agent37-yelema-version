import { backoffice } from "@/lib/backoffice";
import { ApiError, handleError } from "@/lib/http";
import { CONVERSATION_ID } from "@/lib/voice";
import { noStore, signalingBody, voiceToken } from "../../../_shared";

// `POST /api/voice/calls/{id}/think-longer` `{ on }` — « Réfléchis plus longtemps », relayed to the back office.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const on = ((await signalingBody(request)) as { on?: unknown } | undefined)?.on;
    if (!CONVERSATION_ID.test(id) || typeof on !== "boolean") throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
    return noStore(await backoffice.voiceThinkLonger(await voiceToken(), id, on));
  } catch (e) {
    return handleError(e);
  }
}
