import assert from "node:assert/strict";
import { test } from "node:test";
import { accountLabel, accountState, accountsBySlug } from "./connection-accounts.ts";
import type { IntegrationConnection } from "./types.ts";

const conn = (id: string, status: string, slug = "unipile", updatedAt = 0, isDisabled = false): IntegrationConnection => ({
  id,
  status,
  toolkitSlug: slug,
  updatedAt,
  isDisabled,
});

test("chaque compte a son état, une connexion inachevée ou en échec reste visible", () => {
  assert.equal(accountState(conn("a", "ACTIVE")), "active");
  assert.equal(accountState(conn("a", "initiated")), "pending");
  assert.equal(accountState(conn("a", "FAILED")), "failed");
  assert.equal(accountState(conn("a", "EXPIRED")), "failed");
  assert.equal(accountState(conn("a", "ACTIVE", "x", 0, true)), "disabled");
});

test("les doublons d'un outil sont tous listés, l'actif d'abord puis le plus récent", () => {
  const map = accountsBySlug([
    conn("ca_old", "ACTIVE", "unipile", 1),
    conn("ca_new", "ACTIVE", "Unipile", 5),
    conn("ca_stuck", "INITIATED", "unipile", 9),
    conn("ca_cal", "INITIATED", "googlecalendar", 2),
    conn("", "ACTIVE", "gmail"),
  ]);
  assert.deepEqual(map.get("unipile")?.map((c) => c.id), ["ca_new", "ca_old", "ca_stuck"]);
  assert.deepEqual(map.get("googlecalendar")?.map((c) => c.id), ["ca_cal"]);
  assert.equal(map.has("gmail"), false);
});

test("un compte se distingue par la fin de son identifiant", () => {
  assert.equal(accountLabel(conn("unipile_vino-hew", "ACTIVE"), 0), "Compte 1 · vino-hew");
  assert.equal(accountLabel(conn("ca_AbCdEf123456", "ACTIVE"), 1), "Compte 2 · Ef123456");
});
