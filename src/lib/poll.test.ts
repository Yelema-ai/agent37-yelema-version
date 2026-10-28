import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { startPoll, type PollEnv } from "./poll.ts";

function fakeEnv() {
  let t = 0;
  let hidden = false;
  let seq = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const listeners = new Set<() => void>();
  const env: PollEnv = {
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { at: t + ms, fn });
      return id;
    },
    clearTimeout: (h) => void timers.delete(h as number),
    hidden: () => hidden,
    onVisibility: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    now: () => t,
  };
  const flush = () => new Promise((r) => setImmediate(r));
  return {
    env,
    async advance(ms: number) {
      const end = t + ms;
      await flush();
      for (;;) {
        const next = [...timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        t = next[1].at;
        timers.delete(next[0]);
        next[1].fn();
        await flush();
      }
      t = end;
      await flush();
    },
    async setHidden(h: boolean) {
      hidden = h;
      for (const l of listeners) l();
      await flush();
    },
    pending: () => timers.size,
    flush,
  };
}

describe("usePoll (logique)", () => {
  it("tourne à intervalle régulier, une fois au départ", async () => {
    const f = fakeEnv();
    let runs = 0;
    startPoll(() => void runs++, { everyMs: 1000 }, f.env);
    await f.flush();
    assert.equal(runs, 1);
    await f.advance(3000);
    assert.equal(runs, 4);
  });

  it("rien onglet caché, un seul appel au retour", async () => {
    const f = fakeEnv();
    let runs = 0;
    startPoll(() => void runs++, { everyMs: 1000 }, f.env);
    await f.flush();
    await f.setHidden(true);
    await f.advance(10_000);
    assert.equal(runs, 1);
    assert.equal(f.pending(), 0);
    await f.setHidden(false);
    assert.equal(runs, 2);
    await f.setHidden(true);
    await f.setHidden(false);
    assert.equal(runs, 2, "retour rapide : pas dû, pas de nouvel appel");
  });

  it("s'espace jusqu'au plafond, et reset revient au premier délai", async () => {
    const f = fakeEnv();
    const at: number[] = [];
    const p = startPoll(() => void at.push(f.env.now()), { everyMs: 1000, factor: 2, maxMs: 4000 }, f.env);
    await f.advance(15_000);
    assert.deepEqual(at, [0, 2000, 6000, 10_000, 14_000]);
    p.reset();
    await f.advance(1000);
    assert.equal(at.at(-1), 16_000);
  });

  it("s'arrête à l'échéance, et stop arrête tout", async () => {
    const f = fakeEnv();
    let runs = 0;
    startPoll(() => void runs++, { everyMs: 1000, deadlineMs: 2500 }, f.env);
    await f.advance(10_000);
    assert.equal(runs, 3);
    const g = fakeEnv();
    let other = 0;
    const p = startPoll(() => void other++, { everyMs: 1000 }, g.env);
    p.stop();
    await g.advance(5000);
    assert.equal(other, 1);
  });

  it("un seul appel à la fois", async () => {
    const f = fakeEnv();
    let runs = 0;
    let release: () => void = () => {};
    const p = startPoll(() => {
      runs++;
      return new Promise<void>((r) => (release = r));
    }, { everyMs: 1000 }, f.env);
    p.kick();
    p.kick();
    assert.equal(runs, 1);
    release();
    await f.flush();
  });
});
