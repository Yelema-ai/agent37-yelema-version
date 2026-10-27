import assert from "node:assert/strict";
import { test } from "node:test";

import { BUDGET_EXCEEDED, CREDIT_EXHAUSTED, chatFailureMessage, cleanReply, cleanUserMessage, isAccountToTopUp } from "./chat-errors.ts";

test("the gateway's budget refusal becomes the budget sentence", () => {
  assert.equal(chatFailureMessage('litellm.BudgetExceededError: {"error":{"type":"budget_exceeded"}}', "x"), BUDGET_EXCEEDED);
  assert.equal(chatFailureMessage("Error code: 400 - Budget has been exceeded! Current cost: 200.1", "x"), BUDGET_EXCEEDED);
});

test("anything else keeps the caller's sentence", () => {
  assert.equal(chatFailureMessage("Connection reset", "Réessayez."), "Réessayez.");
  assert.equal(chatFailureMessage(undefined, "Réessayez."), "Réessayez.");
  assert.equal(chatFailureMessage("", "Réessayez."), "Réessayez.");
});

test("cleanReply drops the runtime's English lines and repeated paragraphs", () => {
  const raw = "System: your previous response was truncated. Continue.\n\nVoici le point.\n\nVoici le point.\n\nYour request was not processed, send it again.";
  assert.equal(cleanReply(raw), "Voici le point.");
  assert.equal(cleanReply("⚡ Command invoked: /tableau\nJe prépare le tableau."), "Je prépare le tableau.");
  assert.equal(cleanReply("Rien à retirer."), "Rien à retirer.");
  assert.equal(cleanReply("Voici l’affiche.\nMEDIA:/home/node/Livrables/Koffi/affiche.png"), "Voici l’affiche.");
});

test("a provider out of credit gets its own sentence, which the bell recognises", () => {
  assert.equal(chatFailureMessage("Error code: 400 - Your credit balance is too low to access the Anthropic API", "x"), CREDIT_EXHAUSTED);
  assert.equal(chatFailureMessage("insufficient_quota", "x"), CREDIT_EXHAUSTED);
  assert.equal(chatFailureMessage("timeout", "x"), "x");
  assert.ok(isAccountToTopUp(CREDIT_EXHAUSTED) && isAccountToTopUp(BUDGET_EXCEEDED) && !isAccountToTopUp("x"));
});

test("a member's message loses the runtime's continuation orders, and only them", () => {
  const order = "[System: Your previous response was truncated by the output length limit. Continue exactly where you left off. Do not restart or repeat prior text. Finish the answer directly.]";
  assert.equal(cleanUserMessage(`Peux tu stp faire une analyse de mon compte linkedin?\n\n${order}\n\n${order}`), "Peux tu stp faire une analyse de mon compte linkedin?");
  assert.equal(cleanUserMessage("Le système : à revoir\n\nMerci"), "Le système : à revoir\n\nMerci");
});
