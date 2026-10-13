import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";

import { authorizeUrl, challengeOf, decodePending, encodePending, isCode, isScope, keyOf, sameState, startPkce } from "./openrouter-pkce.ts";

describe("OpenRouter PKCE", () => {
  it("the authorize URL carries the S256 challenge and the state, never the verifier", () => {
    const p = startPkce({ kind: "client" }, "anthropic/claude-sonnet-5");
    const url = new URL(authorizeUrl(p, "https://acme.app.yelema.ai/administration/modeles"));
    assert.equal(url.origin + url.pathname, "https://openrouter.ai/auth");
    assert.equal(url.searchParams.get("callback_url"), "https://acme.app.yelema.ai/administration/modeles");
    assert.equal(url.searchParams.get("code_challenge_method"), "S256");
    assert.equal(url.searchParams.get("code_challenge"), createHash("sha256").update(p.verifier).digest("base64url"));
    assert.equal(url.searchParams.get("state"), p.state);
    assert.ok(!url.toString().includes(p.verifier));
    assert.equal(challengeOf(p.verifier).includes("="), false);
  });

  it("two starts never share a verifier or a state", () => {
    const a = startPkce({ kind: "own" }, "m-1");
    const b = startPkce({ kind: "own" }, "m-1");
    assert.ok(a.verifier !== b.verifier && a.state !== b.state && a.verifier.length >= 43);
  });

  it("the cookie comes back as it went, and a tampered one is dropped", () => {
    const p = startPkce({ kind: "member", id: "42" }, "openai/gpt-5");
    assert.deepEqual(decodePending(encodePending(p)), p);
    const forged = (over: Record<string, unknown>) => Buffer.from(JSON.stringify({ ...p, ...over })).toString("base64url");
    for (const raw of [undefined, "", "pas-du-json", forged({ scope: { kind: "member", id: "../client" } }), forged({ scope: { kind: "admin" } }), forged({ model: "x'; id #" }), forged({ verifier: "court" }), forged({ state: 12 }), "A".repeat(2001)]) {
      assert.equal(decodePending(raw), null);
    }
  });

  it("the state returned must be the one sent", () => {
    const p = startPkce({ kind: "client" }, "m-1");
    assert.equal(sameState(p, p.state), true);
    for (const other of [undefined, null, "", `${p.state}x`, p.state.slice(1), startPkce({ kind: "client" }, "m-1").state]) assert.equal(sameState(p, other), false);
  });

  it("only a plain code goes to OpenRouter, only an OpenRouter key comes back", () => {
    assert.ok(isCode("abc123-DEF_456.~x"));
    for (const c of [undefined, "", "court", 'a"b,"x":1', "a b c d e f g h", "x".repeat(513)]) assert.equal(isCode(c), false);
    assert.equal(keyOf({ key: "sk-or-v1-0123456789abcdef0123456789" }), "sk-or-v1-0123456789abcdef0123456789");
    for (const body of [null, {}, { key: 3 }, { key: "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx" }, { key: "sk-or-x\nINJECT=1" }]) assert.equal(keyOf(body), null);
    assert.ok(isScope({ kind: "own" }) && !isScope({ kind: "member" }) && !isScope(null));
  });
});
