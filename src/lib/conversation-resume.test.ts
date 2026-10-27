import assert from "node:assert/strict";
import { test } from "node:test";
import { isResumeSeed, resumeSeed } from "./conversation-resume.ts";

test("the seed carries the conversation, marked, and keeps the end when too long", () => {
  const s = resumeSeed([{ role: "user", content: "Q1" }, { role: "assistant", content: "R1" }], "Awa", "Djénéba");
  assert.ok(isResumeSeed(s));
  assert.match(s, /partagée par Awa avec Djénéba/);
  assert.match(s, /Question : Q1\n\nRéponse : R1$/);
  const long = Array.from({ length: 400 }, (_, i) => ({ role: "user" as const, content: `${"x".repeat(100)} ${i}` }));
  const cut = resumeSeed(long, "", "l'assistant");
  assert.ok(cut.length < 26_000);
  assert.match(cut, /Début de la conversation omis/);
  assert.match(cut, / 399$/);
});
