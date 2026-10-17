import assert from "node:assert/strict";
import { test } from "node:test";
import { JOUR_ZERO_ABSENT, JOUR_ZERO_MAX_BYTES, parseJourZero, readiness } from "./jour-zero.ts";

const check = (id: string, ok: unknown = true, extra: object = {}) => ({ id, label: `Vérif ${id}`, ok, detail: "ok", ...extra });
const file = (extra: object = {}) =>
  JSON.stringify({ version: 1, date: "2026-10-17T08:00:00Z", pret: true, checks: ["outils", "competences", "entreprise", "charte", "canaux"].map((id) => check(id)), ...extra });

test("a version-1 file gives its checks", () => {
  const jz = parseJourZero(file());
  assert.equal(jz?.pret, true);
  assert.equal(jz?.checks.length, 5);
  assert.equal(jz?.date, "2026-10-17T08:00:00Z");
});

test("anything that is not a version-1 preparation is refused", () => {
  assert.equal(parseJourZero("pas du json"), null);
  assert.equal(parseJourZero("[]"), null);
  assert.equal(parseJourZero(file({ version: 2 })), null);
  assert.equal(parseJourZero(file({ pret: "oui" })), null);
  assert.equal(parseJourZero(file({ checks: {} })), null);
  assert.equal(parseJourZero(" ".repeat(JOUR_ZERO_MAX_BYTES + 1)), null);
});

test("a bad check alone is dropped, and an id counts once", () => {
  const jz = parseJourZero(
    file({ checks: [check("outils"), check("inconnu"), check("charte", "oui"), check("canaux", true, { label: "" }), check("outils", false), check("entreprise", true, { detail: "x".repeat(401) })] })
  );
  assert.deepEqual(jz?.checks.map((c) => c.id), ["outils"]);
  assert.equal(parseJourZero(file({ date: "hier" }))?.date, null);
  assert.equal(parseJourZero(file({ checks: [{ id: "outils", label: "Outils", ok: false }] }))?.checks[0].detail, "");
});

test("readiness: ready, partial or not prepared", () => {
  assert.deepEqual(readiness(parseJourZero(file())!), { state: "ready", label: "Prêt" });
  const partial = parseJourZero(file({ pret: false, checks: [check("outils", false), check("charte"), check("canaux"), check("entreprise"), check("competences", false)] }))!;
  assert.deepEqual(readiness(partial), { state: "partial", label: "Préparation 3/5" });
  assert.equal(readiness(parseJourZero(file({ pret: true, checks: [check("outils", false)] }))!).state, "partial");
  assert.deepEqual(readiness(JOUR_ZERO_ABSENT), { state: "absent", label: "Pas encore préparé" });
  assert.equal(readiness(parseJourZero(file({ pret: false, checks: [] }))!).state, "absent");
});
