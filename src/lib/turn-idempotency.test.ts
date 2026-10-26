import assert from "node:assert/strict";
import { test } from "node:test";
import { isNetworkError, messageKeyOf, newMessageKey, withoutRunningTurn } from "./turn-idempotency.ts";

const T = 1_800_000_000_000;
const history = [
  { role: "user", content: "B", at: T - 3_600_000 },
  { role: "assistant", content: "Voici la piste B.", at: T - 3_590_000 },
  { role: "user", content: "B", at: T + 2_000 },
  { role: "assistant", content: "Je regarde le logo.", at: T + 9_000 },
];

test("clé : acceptée par la passerelle, une par envoi", () => {
  const a = newMessageKey();
  assert.equal(messageKeyOf(a), a);
  assert.notEqual(newMessageKey(), a);
  assert.equal(messageKeyOf("a b"), undefined);
  assert.equal(messageKeyOf(42), undefined);
});

test("coupure réseau : renvoi permis ; arrêt demandé : non", () => {
  assert.equal(isNetworkError(new TypeError("Failed to fetch")), true);
  assert.equal(isNetworkError(new DOMException("Arrêté", "AbortError")), false);
});

test("historique lu en plein tour : le message du tour n'est pas affiché deux fois", () => {
  assert.deepEqual(withoutRunningTurn(history, { role: "user", content: "B", at: T }), history.slice(0, 2));
});

test("même texte qu'un ancien message : l'ancien reste, seul le tour en cours est retiré", () => {
  const before = history.slice(0, 2);
  assert.deepEqual(withoutRunningTurn(before, { role: "user", content: "B", at: T }), before);
});

test("tour pas encore enregistré, ou rattaché sans message : rien n'est retiré", () => {
  assert.deepEqual(withoutRunningTurn(history, { role: "user", content: "Autre chose", at: T }), history);
  assert.deepEqual(withoutRunningTurn(history, undefined), history);
});

test("pièces jointes ajoutées par le moteur au texte enregistré : reconnu quand même", () => {
  const h = [{ role: "user", content: "Lis ce contrat\n\n[Attached files:\n- /home/node/Livrables/a.pdf]", at: T + 500 }];
  assert.deepEqual(withoutRunningTurn(h, { role: "user", content: "Lis ce contrat", at: T }), []);
});
