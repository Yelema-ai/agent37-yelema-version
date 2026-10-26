import assert from "node:assert/strict";
import { test } from "node:test";
import { finalReply } from "./turn-reply.ts";

test("the steps written before each tool leave the reply", () => {
  const narration = ["Je cherche le devis.", "Je prépare le PDF."];
  assert.equal(finalReply("Je cherche le devis.Je prépare le PDF.\n\nVoici le devis Unifood.", narration), "Voici le devis Unifood.");
});

test("a reply without steps, or one the runtime already trimmed, is kept as is", () => {
  assert.equal(finalReply("Bonjour, que puis-je faire ?", []), "Bonjour, que puis-je faire ?");
  assert.equal(finalReply("Voici le devis.", ["Je cherche le devis."]), "Voici le devis.");
});

test("when nothing follows the last tool, the last thing said is the reply", () => {
  assert.equal(finalReply("Je regarde.Voici le résumé, je l’enregistre.", ["Je regarde.", "Voici le résumé, je l’enregistre."]), "Voici le résumé, je l’enregistre.");
});
