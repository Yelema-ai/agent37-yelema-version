import assert from "node:assert/strict";
import { test } from "node:test";
import { absoluteFr, relativeFr } from "./fr-dates.ts";

const now = Date.UTC(2026, 9, 16, 12, 0);

test("relative dates, past and future", () => {
  assert.equal(relativeFr(now - 20_000, now), "à l’instant");
  assert.equal(relativeFr(now - 3 * 3_600_000, now), "il y a 3 heures");
  assert.equal(relativeFr(now + 2 * 86_400_000, now), "après-demain");
  assert.equal(relativeFr(now - 86_400_000, now), "hier");
});

test("absolute date in UTC", () => {
  assert.match(absoluteFr(Date.UTC(2026, 9, 16, 9, 5)), /16 oct\. 2026.*09:05/);
});
