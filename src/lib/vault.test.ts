import assert from "node:assert/strict";
import { test } from "node:test";
import { parseVaultDraft, profileLabel, vaultPath, vaultRefusalMessage } from "./vault.ts";

test("the back office path of a vault scope, profile and handle; null for anything malformed", () => {
  assert.equal(vaultPath({ kind: "own" }, "adjoua"), "/app/vault/own/adjoua");
  assert.equal(vaultPath({ kind: "member", id: "42" }, "default", "vault_0123456789ab"), "/app/vault/members/42/default/vault_0123456789ab");
  assert.equal(vaultPath({ kind: "own" }, "../x"), null);
  assert.equal(vaultPath({ kind: "member", id: "4a" }, "adjoua"), null);
  assert.equal(vaultPath({ kind: "own" }, "adjoua", "a/b"), null);
});

test("a draft keeps its six fields only; the password is never trimmed", () => {
  const d = parseVaultDraft({ label: " CNPS ", origin: "https://e.cnps.ci", identifierType: "email", identifier: " rh@acme.ci ", password: " p ", purpose: " Déclarer ", extra: 1 });
  assert.deepEqual(d, { label: "CNPS", origin: "https://e.cnps.ci", identifierType: "email", identifier: "rh@acme.ci", password: " p ", purpose: "Déclarer" });
  assert.equal(parseVaultDraft({ label: "x", origin: "https://a.b", identifierType: "login", identifier: "u", password: "p" }), null);
  assert.equal(parseVaultDraft({ label: "x", origin: "https://a.b", identifierType: "email", identifier: "u", password: "" }), null);
});

test("names and refusal sentences", () => {
  assert.equal(profileLabel("default"), "Assistant général");
  assert.equal(profileLabel("acme__koffi"), "Koffi");
  assert.equal(profileLabel("adjoua"), "Adjoua");
  assert.match(vaultRefusalMessage("bad_origin") ?? "", /https/);
  assert.equal(vaultRefusalMessage("toString"), null);
});
