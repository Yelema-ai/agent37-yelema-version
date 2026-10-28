import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ageOf, cachedFetch, remember } from "./client-cache.ts";

describe("lectures partagées du navigateur", () => {
  it("une lecture d'avance récente sert la page : aucun second appel dans le délai", async () => {
    let calls = 0;
    const load = async () => (calls++, ["s1"]);
    await cachedFetch("sessions:a", load, 60_000);
    await cachedFetch("sessions:a", load, 60_000);
    assert.equal(calls, 1);
    assert.ok(ageOf("sessions:a") < 1_000);
  });

  it("deux demandes simultanées font un seul appel ; une clé jamais lue a un âge infini", async () => {
    let calls = 0;
    const load = async () => (calls++, 1);
    await Promise.all([cachedFetch("models:b", load), cachedFetch("models:b", load)]);
    assert.equal(calls, 1);
    assert.equal(ageOf("jamais"), Infinity);
    remember("jamais", 0);
    assert.ok(ageOf("jamais") < 1_000);
  });
});
