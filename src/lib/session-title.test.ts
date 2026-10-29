import { test } from "node:test";
import assert from "node:assert/strict";
import { sessionTitle } from "./session-title.ts";

test("a conversation opened by a command is named in French", () => {
  assert.equal(sessionTitle("Run tableau command #4", "/tableau"), "Tableau de bord");
  assert.equal(sessionTitle("Run tableau command", null), "Tableau de bord");
  assert.equal(sessionTitle(null, "/tableau"), "Tableau de bord");
  assert.equal(sessionTitle("Run rapport command #2", null), "Commande rapport");
});

test("any other conversation keeps its title, else its first words", () => {
  assert.equal(sessionTitle("Relance des devis", "Relance"), "Relance des devis");
  assert.equal(sessionTitle("  ", "Bonjour Fatima"), "Bonjour Fatima");
  assert.equal(sessionTitle(null, null), null);
});
