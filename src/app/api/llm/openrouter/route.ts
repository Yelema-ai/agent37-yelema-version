import { cookies } from "next/headers";
import { backoffice } from "@/lib/backoffice";
import { ApiError, readJson } from "@/lib/http";
import { OPENROUTER_KEYS_URL, PKCE_MAX_AGE_S, authorizeUrl, decodePending, encodePending, isCode, isModel, isScope, keyOf, sameState, startPkce } from "@/lib/openrouter-pkce";
import { hostOf } from "@/lib/tenant-resolver";
import { noStore, settingsError, settingsToken } from "../_shared";

const COOKIE = process.env.NODE_ENV === "production" ? "__Host-yelema_or_pkce" : "yelema_or_pkce";
const COOKIE_OPTIONS = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: PKCE_MAX_AGE_S };
const CALLBACK_PATH = "/administration/modeles";
const FAILED = "La connexion à OpenRouter n’a pas abouti. Réessayez, ou collez une clé API.";

// `POST /api/llm/openrouter` — starts OpenRouter's one-click connection: answers the page where the
// member approves. The verifier stays here, in an httpOnly cookie, with whom the key is for.
export async function POST(request: Request) {
  try {
    await settingsToken();
    const { scope, model } = await readJson<{ scope?: unknown; model?: unknown }>(request);
    if (!isScope(scope) || !isModel(model)) throw new ApiError(400, "bad_request", "Indiquez le modèle que vos experts utiliseront.");
    const pending = startPkce(scope, model);
    (await cookies()).set(COOKIE, encodePending(pending), COOKIE_OPTIONS);
    // The way back is this app's own page on the host that was called, never an address from the body.
    const host = hostOf(request.headers);
    const origin = host && host !== "localhost" ? `https://${host}` : new URL(request.url).origin;
    return noStore({ url: authorizeUrl(pending, `${origin}${CALLBACK_PATH}`) });
  } catch (e) {
    return settingsError(e);
  }
}

// `PUT /api/llm/openrouter` — the member is back with OpenRouter's one-time code. The server trades
// it for a key and hands the key to the back office, which checks, keeps and installs it like any
// other. The key never reaches the browser.
export async function PUT(request: Request) {
  try {
    const token = await settingsToken();
    const jar = await cookies();
    const pending = decodePending(jar.get(COOKIE)?.value);
    jar.delete(COOKIE);
    const { code, state } = await readJson<{ code?: unknown; state?: unknown }>(request);
    if (!pending || !isCode(code) || !sameState(pending, state)) throw new ApiError(400, "openrouter_failed", FAILED);

    let key: string | null = null;
    try {
      const res = await fetch(OPENROUTER_KEYS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, code_verifier: pending.verifier, code_challenge_method: "S256" }),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) key = keyOf(await res.json().catch(() => null));
      else console.error("[openrouter] exchange refused:", res.status);
    } catch (e) {
      console.error("[openrouter] exchange unreachable:", e instanceof Error ? e.name : "error");
    }
    if (!key) throw new ApiError(502, "openrouter_failed", FAILED);

    return noStore(await backoffice.setLlmKey(token, pending.scope, { provider: "openrouter", secret: key, model: pending.model }));
  } catch (e) {
    return settingsError(e);
  }
}
