import assert from "node:assert/strict";
import { test } from "node:test";
import { personToAdd } from "./dashboard-people.ts";

const ctx = { chosen: ["awa@client.ci"], members: [{ email: "Awa@Client.ci" }, { email: "koffi@client.ci" }], self: "moi@client.ci" };

test("un membre de l'espace s'ajoute, normalisé", () => {
  assert.deepEqual(personToAdd("  KOFFI@client.ci ", ctx), { ok: true, email: "koffi@client.ci" });
});

test("adresse invalide, doublon, soi-même et personne hors entreprise sont refusés", () => {
  assert.equal(personToAdd("koffi", ctx).ok, false);
  assert.deepEqual(personToAdd("pas une@adresse", ctx), { ok: false, reason: "invalid", email: "pas une@adresse" });
  assert.equal((personToAdd("awa@client.ci", ctx) as { reason: string }).reason, "duplicate");
  assert.equal((personToAdd("Moi@client.ci", ctx) as { reason: string }).reason, "self");
  assert.equal((personToAdd("banquier@banque.ci", ctx) as { reason: string }).reason, "outsider");
  assert.equal((personToAdd(`${"a".repeat(250)}@x.ci`, ctx) as { reason: string }).reason, "invalid");
});
