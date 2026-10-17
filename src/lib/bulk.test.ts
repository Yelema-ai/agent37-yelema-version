import assert from "node:assert/strict";
import { test } from "node:test";
import { routineBulkMessage, runPool } from "./bulk.ts";

test("the pool keeps every outcome in order and never exceeds its limit", async () => {
  let running = 0;
  let peak = 0;
  const out = await runPool([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5 * (n % 3)));
    running -= 1;
    if (n === 4) throw new Error("non");
    return n * 10;
  });
  assert.equal(peak, 3);
  assert.deepEqual(out.map((r) => (r.status === "fulfilled" ? r.value : "échec")), [10, 20, 30, "échec", 50, 60, 70]);
  assert.deepEqual(await runPool([], 3, async () => 1), []);
});

test("the toast sums the outcome up", () => {
  assert.equal(routineBulkMessage("activate", 12, 1), "12 routines activées, 1 en échec");
  assert.equal(routineBulkMessage("activate", 1, 0), "1 routine activée");
  assert.equal(routineBulkMessage("pause", 3, 0), "3 routines mises en pause");
  assert.equal(routineBulkMessage("pause", 1, 2), "1 routine mise en pause, 2 en échec");
  assert.equal(routineBulkMessage("activate", 0, 2), "Aucune routine activée, 2 en échec");
});
