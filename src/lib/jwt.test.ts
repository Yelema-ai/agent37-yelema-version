import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync, sign, type KeyObject } from "node:crypto";
import { describe, it } from "node:test";

import { tokenKid, verifyEs256, type Jwk } from "./jwt.ts";

const ISS = "https://ref.supabase.co/auth/v1";
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

function es256(privateKey: KeyObject, header: Record<string, unknown>, payload: Record<string, unknown>): string {
  const input = `${b64(header)}.${b64(payload)}`;
  const sig = sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${sig.toString("base64url")}`;
}

const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk: Jwk = { ...(publicKey.export({ format: "jwk" }) as Jwk), kid: "k1", alg: "ES256" };
const other = generateKeyPairSync("ec", { namedCurve: "P-256" });
const now = 1_700_000_000;
const claims = { sub: "user-1", email: "a@b.c", aud: "authenticated", iss: ISS, exp: now + 3600 };
const expect = { issuer: ISS, audience: "authenticated", nowS: now };

describe("vérification locale du jeton de session", () => {
  it("accepte un ES256 signé par une clé du projet", () => {
    const token = es256(privateKey, { alg: "ES256", kid: "k1", typ: "JWT" }, claims);
    assert.deepEqual(verifyEs256(token, [jwk], expect), { ok: true, claims: { sub: "user-1", email: "a@b.c", exp: now + 3600 } });
    assert.equal(tokenKid(token), "k1");
  });

  it("refuse un autre algorithme (HS256, none)", () => {
    const input = `${b64({ alg: "HS256", kid: "k1" })}.${b64(claims)}`;
    const hs = `${input}.${createHmac("sha256", "secret").update(input).digest("base64url")}`;
    assert.deepEqual(verifyEs256(hs, [jwk], expect), { ok: false, reason: "alg" });
    assert.deepEqual(verifyEs256(`${b64({ alg: "none" })}.${b64(claims)}.`, [jwk], expect), { ok: false, reason: "alg" });
  });

  it("refuse une signature d'une autre clé, ou une clé inconnue", () => {
    assert.deepEqual(verifyEs256(es256(other.privateKey, { alg: "ES256", kid: "k1" }, claims), [jwk], expect), { ok: false, reason: "signature" });
    assert.deepEqual(verifyEs256(es256(privateKey, { alg: "ES256", kid: "k2" }, claims), [jwk], expect), { ok: false, reason: "unknown_key" });
  });

  it("refuse un jeton expiré, d'un autre émetteur ou d'un autre public", () => {
    const sign1 = (p: Record<string, unknown>) => es256(privateKey, { alg: "ES256", kid: "k1" }, { ...claims, ...p });
    assert.deepEqual(verifyEs256(sign1({ exp: now - 1 }), [jwk], expect), { ok: false, reason: "expired" });
    assert.deepEqual(verifyEs256(sign1({ iss: "https://autre.supabase.co/auth/v1" }), [jwk], expect), { ok: false, reason: "issuer" });
    assert.deepEqual(verifyEs256(sign1({ aud: "anon" }), [jwk], expect), { ok: false, reason: "audience" });
    assert.deepEqual(verifyEs256("pas.un.jeton", [jwk], expect), { ok: false, reason: "malformed" });
  });
});
