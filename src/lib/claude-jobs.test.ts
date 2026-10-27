import assert from "node:assert/strict";
import { test } from "node:test";
import { jobsToRoutines, newJob, patchJob, type ClaudeJob } from "./claude-jobs.ts";

const shipped: ClaudeJob = { id: "point-hebdo", name: "Point hebdo (Djénéba)", prompt: "Tu es Djénéba. Fais le point de la semaine.", enabled: false, schedule: { kind: "cron", expr: "0 8 * * 1" }, deliver: "local" };

test("une routine du pack jamais lancée est proposée ; le nom perd celui de l’expert ; le passage vient du hub", () => {
  const [r] = jobsToRoutines([shipped], "djeneba", "Djénéba", {});
  assert.equal(r!.name, "Point hebdo");
  assert.equal(r!.suggested, true);
  assert.equal(r!.schedule, "0 8 * * 1");
  const [ran] = jobsToRoutines([{ ...shipped, enabled: true }], "djeneba", "Djénéba", { "djeneba/point-hebdo": { lastRunAt: "2026-10-20T08:00:05Z", ok: true } });
  assert.equal(ran!.lastRunAt, "2026-10-20T08:00:05Z");
  assert.equal(ran!.suggested, false);
});

test("une nouvelle routine : id tiré du nom, unique, active, ponctuelle si l’horaire est une date", () => {
  const j = newJob({ name: "Relance clients", prompt: "Relance.", schedule: "2026-11-02T09:00:00Z" }, new Set(["relance-clients"]));
  assert.equal(j.id, "relance-clients-2");
  assert.deepEqual(j.schedule, { kind: "once", run_at: "2026-11-02T09:00:00.000Z" });
  assert.equal(jobsToRoutines([j], "djeneba", "Djénéba", {})[0]!.suggested, false);
});

test("modifier garde les champs du pack et une demande de lancement en cours", () => {
  const j = patchJob({ ...shipped, run_requested_at: "2026-10-24T10:00:00Z" }, { name: "Point", prompt: "Autre.", schedule: "0  9 * * 1" });
  assert.equal(j.deliver, "local");
  assert.equal(j.run_requested_at, "2026-10-24T10:00:00Z");
  assert.deepEqual(j.schedule, { kind: "cron", expr: "0 9 * * 1" });
});
