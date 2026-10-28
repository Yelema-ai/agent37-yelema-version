import { ApiError } from "@/lib/http";
import { requireBackofficeToken } from "@/lib/auth";

// Voice calls are the back office's: these routes only relay the browser's signaling with the
// member's session and the request's workspace. It checks the member, the expert and the voice.
export const voiceToken = (): Promise<string> => requireBackofficeToken("Les appels vocaux ne sont pas disponibles.");

/** The SDK's JSON body, or undefined when it sends none. */
export async function signalingBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
  }
}

export { noStore } from "@/lib/http";
