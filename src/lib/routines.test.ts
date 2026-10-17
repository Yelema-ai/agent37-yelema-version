import assert from "node:assert/strict";
import { test } from "node:test";
import { isRoutineRun, isRunOf, isSilentRun, routineOfSession, routineRunText, runOutcome } from "./routines.ts";

const HINT = "[IMPORTANT: You are running as a scheduled cron job. DELIVERY: … [SILENT] … context for this run, not as a request to schedule another job.]\n\n";

test("a routine's run: Hermes's preamble is set apart from the routine's own text", () => {
  assert.equal(isRoutineRun(`${HINT}Fais le point trésorerie.`), true);
  assert.equal(routineRunText(`${HINT}Fais le point trésorerie.`), "Fais le point trésorerie.");
  const withSkill = `[IMPORTANT: The user has invoked the "x" skill…]\n\nskill body\n\n${HINT}Relance les impayés.`;
  assert.equal(isRoutineRun(withSkill), true);
  assert.equal(routineRunText(withSkill), "Relance les impayés.");
  assert.equal(isRoutineRun("Bonjour"), false);
});

test("[SILENT] answers, alone or on their own line, never mid-sentence", () => {
  assert.equal(isSilentRun("[SILENT]"), true);
  assert.equal(isSilentRun("  [silent] Rien de neuf"), true);
  assert.equal(isSilentRun("Rien de neuf aujourd’hui.\nNO_REPLY"), true);
  assert.equal(isSilentRun("Le mode [SILENT] est utile."), false);
  assert.equal(isSilentRun(""), false);
  assert.equal(runOutcome("[SILENT]"), "silent");
  assert.equal(runOutcome("Voici le point."), "sent");
  assert.equal(runOutcome(null), "failed");
  assert.equal(runOutcome("[CRON_FAILURE]\nboom"), "failed");
});

test("a run's conversation names its routine", () => {
  assert.equal(routineOfSession({ id: "cron_abc_20261016_090000", title: "Point trésorerie · Oct 16 09:00" }), "Point trésorerie");
  assert.equal(routineOfSession({ id: "f".repeat(32), title: "Point trésorerie · Oct 06 09:00 #2", preview: HINT }), "Point trésorerie");
  assert.equal(routineOfSession({ id: "f".repeat(32), title: "Réunion · Oct 16 09:00", preview: "Prépare la réunion" }), null);
});

test("runs of one routine, by id or by title", () => {
  const routine = { id: "abc", hermesName: "Point  trésorerie" };
  assert.equal(isRunOf({ id: "cron_abc_20261016_090000" }, routine), true);
  assert.equal(isRunOf({ id: "1".repeat(32), title: "Point trésorerie · Oct 16 09:00", preview: HINT }, routine), true);
  assert.equal(isRunOf({ id: "1".repeat(32), title: "Point trésorerie · Oct 16 09:00", preview: "Bonjour" }, routine), false);
  assert.equal(isRunOf({ id: "cron_abcd_20261016_090000", title: "Autre · Oct 16 09:00" }, routine), false);
});
