import assert from "node:assert/strict";
import { test } from "node:test";

import { mergeRail, movedUpstream } from "./chat-rail.ts";

const row = (session_id: string, last_active: number) => ({ session_id, title: session_id, last_active });

test("the server list wins; a just-created local row is kept, an old orphan is dropped", () => {
  const now = 1_000_000;
  const merged = mergeRail([row("a", 10), row("b", 5)], [row("new", now - 1000), row("gone", now - 10 * 60_000), row("a", now)], now);
  assert.deepEqual(merged.map((s) => s.session_id), ["new", "a", "b"]);
  assert.equal(merged[1]!.last_active, 10);
});

test("the open thread moved upstream only when its last activity grew", () => {
  assert.equal(movedUpstream([row("a", 10)], [row("a", 20)], "a"), true);
  assert.equal(movedUpstream([row("a", 10)], [row("a", 10)], "a"), false);
  assert.equal(movedUpstream(null, [row("a", 20)], "a"), false);
  assert.equal(movedUpstream([row("a", 10)], [row("a", 20)], null), false);
});
