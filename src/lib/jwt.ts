import { createPublicKey, verify, type JsonWebKey } from "node:crypto";

// Local check of a Supabase access token (ES256, keys from the project's JWKS): who is signed in,
// without a round-trip. Only ES256 is accepted; anything else reads as "cannot tell here".

export interface Jwk extends JsonWebKey {
  kid?: string;
  alg?: string;
}

export interface VerifiedClaims {
  sub: string;
  email: string | null;
  exp: number;
}

export type JwtCheck = { ok: true; claims: VerifiedClaims } | { ok: false; reason: "malformed" | "alg" | "unknown_key" | "signature" | "expired" | "issuer" | "audience" };

const part = (s: string): Record<string, unknown> | null => {
  try {
    const v = JSON.parse(Buffer.from(s, "base64url").toString("utf8")) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

/** The `kid` a token was signed with, to know whether the key set must be read again. */
export function tokenKid(token: string): string | null {
  const header = part(token.split(".")[0] ?? "");
  return typeof header?.kid === "string" ? header.kid : null;
}

export function verifyEs256(token: string, keys: Jwk[], expect: { issuer: string; audience: string; nowS?: number }): JwtCheck {
  const parts = token.split(".");
  if (parts.length !== 3 || token.length > 8000) return { ok: false, reason: "malformed" };
  const [h, p, sig] = parts;
  const header = part(h);
  const payload = part(p);
  if (!header || !payload) return { ok: false, reason: "malformed" };
  if (header.alg !== "ES256") return { ok: false, reason: "alg" };
  const jwk = keys.find((k) => k.kid === header.kid && k.kty === "EC" && k.crv === "P-256" && (!k.alg || k.alg === "ES256"));
  if (!jwk) return { ok: false, reason: "unknown_key" };
  let good = false;
  try {
    const key = createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y }, format: "jwk" });
    good = verify("sha256", Buffer.from(`${h}.${p}`), { key, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
  } catch {
    good = false;
  }
  if (!good) return { ok: false, reason: "signature" };
  const now = expect.nowS ?? Date.now() / 1000;
  if (typeof payload.exp !== "number" || payload.exp <= now) return { ok: false, reason: "expired" };
  if (typeof payload.nbf === "number" && payload.nbf > now + 30) return { ok: false, reason: "expired" };
  if (payload.iss !== expect.issuer) return { ok: false, reason: "issuer" };
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(expect.audience)) return { ok: false, reason: "audience" };
  if (typeof payload.sub !== "string" || !payload.sub) return { ok: false, reason: "malformed" };
  return { ok: true, claims: { sub: payload.sub, email: typeof payload.email === "string" ? payload.email : null, exp: payload.exp } };
}
