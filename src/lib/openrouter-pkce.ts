import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import type { SettingScope } from "./llm.ts";

// OpenRouter's one-click connection (OAuth PKCE, https://openrouter.ai/docs/use-cases/oauth-pkce).
// The member approves on OpenRouter's page, which sends them back with a one-time code; the SERVER
// trades it for a key and hands that key to the back office. Neither the verifier nor the key ever
// reaches the browser: the verifier waits in an httpOnly cookie, bound to who asked and for whom.

export const OPENROUTER_AUTH_URL = "https://openrouter.ai/auth";
export const OPENROUTER_KEYS_URL = "https://openrouter.ai/api/v1/auth/keys";
/** OpenRouter's codes last ten minutes; so does the cookie. */
export const PKCE_MAX_AGE_S = 600;

export interface PkcePending {
  verifier: string;
  /** Returned by OpenRouter on the way back: an answer that does not carry it is not ours. */
  state: string;
  scope: SettingScope;
  model: string;
}

const token = (bytes: number) => randomBytes(bytes).toString("base64url");
export const challengeOf = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

export function startPkce(scope: SettingScope, model: string): PkcePending {
  return { verifier: token(48), state: token(24), scope, model };
}

/** Where the member is sent to approve. `callbackUrl` is this app's own page, never a caller's choice. */
export function authorizeUrl(pending: PkcePending, callbackUrl: string): string {
  const url = new URL(OPENROUTER_AUTH_URL);
  url.searchParams.set("callback_url", callbackUrl);
  url.searchParams.set("code_challenge", challengeOf(pending.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", pending.state);
  url.searchParams.set("key_label", "Yelema");
  return url.toString();
}

export const encodePending = (p: PkcePending): string => Buffer.from(JSON.stringify(p), "utf8").toString("base64url");

const TOKEN = /^[A-Za-z0-9_-]{16,128}$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,120}$/;

export function isScope(v: unknown): v is SettingScope {
  const s = v as { kind?: unknown; id?: unknown } | null;
  if (!s || typeof s !== "object") return false;
  return s.kind === "client" || s.kind === "own" || (s.kind === "member" && typeof s.id === "string" && /^\d{1,12}$/.test(s.id));
}

export const isModel = (v: unknown): v is string => typeof v === "string" && MODEL.test(v);

/** What the cookie holds, or null when it is absent, tampered with or not one of ours. */
export function decodePending(raw: string | undefined): PkcePending | null {
  if (!raw || raw.length > 2000) return null;
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<PkcePending>;
    if (typeof p.verifier !== "string" || !TOKEN.test(p.verifier) || typeof p.state !== "string" || !TOKEN.test(p.state)) return null;
    if (!isScope(p.scope) || !isModel(p.model)) return null;
    return { verifier: p.verifier, state: p.state, scope: p.scope, model: p.model };
  } catch {
    return null;
  }
}

export function sameState(pending: PkcePending, returned: unknown): boolean {
  if (typeof returned !== "string" || returned.length !== pending.state.length) return false;
  return timingSafeEqual(Buffer.from(returned), Buffer.from(pending.state));
}

/** OpenRouter's one-time code, in the plain form it can go into a JSON body. */
export const isCode = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9._~-]{8,512}$/.test(v);

/** The key out of OpenRouter's answer, or null: anything else than an OpenRouter key is not passed on. */
export function keyOf(body: unknown): string | null {
  const key = (body as { key?: unknown } | null)?.key;
  return typeof key === "string" && /^sk-or-[A-Za-z0-9_-]{20,250}$/.test(key) ? key : null;
}
