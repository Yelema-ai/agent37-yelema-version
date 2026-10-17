import assert from "node:assert/strict";
import { test } from "node:test";

import { BUDGET_EXCEEDED, chatFailureMessage } from "./chat-errors.ts";

test("the gateway's budget refusal becomes the budget sentence", () => {
  assert.equal(chatFailureMessage('litellm.BudgetExceededError: {"error":{"type":"budget_exceeded"}}', "x"), BUDGET_EXCEEDED);
  assert.equal(chatFailureMessage("Error code: 400 - Budget has been exceeded! Current cost: 200.1", "x"), BUDGET_EXCEEDED);
});

test("anything else keeps the caller's sentence", () => {
  assert.equal(chatFailureMessage("Connection reset", "Réessayez."), "Réessayez.");
  assert.equal(chatFailureMessage(undefined, "Réessayez."), "Réessayez.");
  assert.equal(chatFailureMessage("", "Réessayez."), "Réessayez.");
});
