import { NextResponse } from "next/server";
import { BackofficeError } from "@/lib/backoffice";
import { ApiError, apiError, handleError, readJson } from "@/lib/http";
import { llmRefusalMessage, parseKeyDraft, type LlmKeyDraft } from "@/lib/llm";
import { authViaBackoffice } from "@/lib/runtime-config";
import { readSession } from "@/lib/session";

// The model keys are the back office's: these routes exist only where it signs users in. They
// answer the session token to call it with and nothing about the caller's role, which the back
// office reads on the session itself, on every call.
export async function settingsToken(): Promise<string> {
  if (!authViaBackoffice()) throw new ApiError(404, "not_found", "Ce réglage n’est pas disponible.");
  const session = await readSession();
  if (!session) throw new ApiError(401, "unauthorized", "Connectez-vous pour continuer.");
  return session.accessToken;
}

export async function keyDraft(request: Request): Promise<LlmKeyDraft> {
  const draft = parseKeyDraft(await readJson(request));
  if (!draft) throw new ApiError(400, "bad_request", "Cette demande n’a pas pu être traitée.");
  return draft;
}

export function noStore<T>(data: T): NextResponse {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}

// A refusal of the back office reaches the member as a sentence written here, chosen by its code:
// its own text is for the operator. An expired session and an outage keep their usual answers.
export function settingsError(e: unknown, sentence: (code: string, suggestions: readonly unknown[]) => string | null = llmRefusalMessage): NextResponse {
  if (e instanceof BackofficeError && e.status !== 401) {
    const message = sentence(e.code, e.suggestions);
    if (message) return apiError(message, e.status, e.code);
  }
  return handleError(e);
}
