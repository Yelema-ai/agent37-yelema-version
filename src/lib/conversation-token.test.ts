import assert from "node:assert/strict";
import { test } from "node:test";

import { conversationKey, openConversation, sealConversation } from "./conversation-token.ts";

const key = conversationKey({ DASHBOARD_SHARE_SECRET: "un-secret-de-test-assez-long" });
const claims = { w: "ws_unifood", a: "inst_1", p: "unifood__kouassi", s: "ses_1", t: "Relance des devis", o: "Aïcha", e: 2_000_000_000 };

test("a sealed link opens to the same conversation", () => {
  assert.deepEqual(openConversation(sealConversation(claims, key), 1_000_000_000_000, key), claims);
});

test("an expired, altered or foreign link opens to nothing", () => {
  const token = sealConversation(claims, key)!;
  assert.equal(openConversation(token, 2_000_000_001_000, key), null);
  assert.equal(openConversation(token.slice(0, -2) + (token.endsWith("A") ? "BB" : "AA"), 0, key), null);
  assert.equal(openConversation(token, 0, conversationKey({ DASHBOARD_SHARE_SECRET: "un-autre-secret-assez-long" })), null);
  assert.equal(openConversation("pas un jeton", 0, key), null);
});

test("without a secret, no link is made", () => {
  assert.equal(conversationKey({}), null);
  assert.equal(sealConversation(claims, null), null);
});
