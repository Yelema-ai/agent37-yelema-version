import { NextResponse } from "next/server";
import { BackofficeError } from "@/lib/backoffice";
import { apiError, handleError } from "@/lib/http";
import { llmRefusalMessage } from "@/lib/llm";
import { requireBackofficeToken } from "@/lib/auth";

// The model keys are the back office's: these routes exist only where it signs users in. They
// answer the session token to call it with and nothing about the caller's role, which the back
// office reads on the session itself, on every call.
export const settingsToken = (): Promise<string> => requireBackofficeToken("Ce réglage n’est pas disponible.");

export { noStore } from "@/lib/http";

// A refusal of the back office reaches the member as a sentence written here, chosen by its code:
// its own text is for the operator. An expired session and an outage keep their usual answers.
export function settingsError(e: unknown, sentence: (code: string, suggestions: readonly unknown[]) => string | null = llmRefusalMessage): NextResponse {
  if (e instanceof BackofficeError && e.status !== 401) {
    const message = sentence(e.code, e.suggestions);
    if (message) return apiError(message, e.status, e.code);
  }
  return handleError(e);
}
