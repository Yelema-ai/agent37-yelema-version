import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memo } from "./memo.ts";

function clock(start = 1_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("memo", () => {
  it("un seul chargement pour des appels simultanés", async () => {
    let loads = 0;
    const m = memo<number>({ ttlMs: 1000 });
    const load = async () => {
      loads++;
      await new Promise((r) => setTimeout(r, 5));
      return 7;
    };
    const all = await Promise.all([m.get("k", load), m.get("k", load), m.get("k", load)]);
    assert.deepEqual(all, [7, 7, 7]);
    assert.equal(loads, 1);
  });

  it("garde la réponse ttlMs, puis recharge", async () => {
    const c = clock();
    let n = 0;
    const m = memo<number>({ ttlMs: 100, now: c.now });
    assert.equal(await m.get("k", async () => ++n), 1);
    c.advance(50);
    assert.equal(await m.get("k", async () => ++n), 1);
    c.advance(60);
    assert.equal(await m.get("k", async () => ++n), 2);
  });

  it("ne garde jamais un échec", async () => {
    const m = memo<number>({ ttlMs: 1000 });
    await assert.rejects(m.get("k", async () => Promise.reject(new Error("panne"))));
    assert.equal(await m.get("k", async () => 3), 3);
  });

  it("sert l'ancienne réponse pendant le rechargement (staleMs)", async () => {
    const c = clock();
    const pending: Promise<void>[] = [];
    const m = memo<number>({ ttlMs: 100, staleMs: 1000, now: c.now, background: (p) => void pending.push(p) });
    await m.get("k", async () => 1);
    c.advance(200);
    assert.equal(await m.get("k", async () => 2), 1);
    assert.equal(pending.length, 1);
    await pending[0];
    assert.equal(await m.get("k", async () => 3), 2);
  });

  it("sert la dernière réponse connue sur une panne (staleOnErrorMs)", async () => {
    const c = clock();
    const m = memo<string>({ ttlMs: 100, staleOnErrorMs: 10_000, now: c.now });
    await m.get("k", async () => "a");
    c.advance(5_000);
    assert.equal(await m.get("k", async () => Promise.reject(new Error("panne"))), "a");
    c.advance(6_000);
    await assert.rejects(m.get("k", async () => Promise.reject(new Error("panne"))));
  });

  it("un refus efface la réponse gardée", async () => {
    const c = clock();
    const m = memo<string>({ ttlMs: 100, staleOnErrorMs: 10_000, evict: (e) => (e as Error).message === "refus", now: c.now });
    await m.get("k", async () => "a");
    c.advance(200);
    await assert.rejects(m.get("k", async () => Promise.reject(new Error("refus"))));
    assert.equal(m.peek("k"), undefined);
  });

  it("une promesse bloquée n'est plus partagée au-delà de maxFlightMs", async () => {
    const c = clock();
    const m = memo<number>({ ttlMs: 100, maxFlightMs: 1000, now: c.now });
    void m.get("k", () => new Promise<number>(() => {}));
    c.advance(1500);
    assert.equal(await m.get("k", async () => 9), 9);
  });

  it("borne le nombre d'entrées en retirant les plus anciennes", async () => {
    const m = memo<number>({ ttlMs: 1000, maxEntries: 2 });
    await m.get("a", async () => 1);
    await m.get("b", async () => 2);
    await m.get("c", async () => 3);
    assert.equal(m.peek("a"), undefined);
    assert.equal(m.peek("b"), 2);
    assert.equal(m.peek("c"), 3);
  });
});
