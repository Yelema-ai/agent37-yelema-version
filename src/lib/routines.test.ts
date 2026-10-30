import assert from "node:assert/strict";
import { test } from "node:test";
import { isMemoryRun, isRoutineRun, isUpkeep, isRunOf, isSilentRun, routineOfSession, routinePlainText, routineRunText, runOutcome } from "./routines.ts";

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

const run = (task: string) => `${HINT}${task}`;

test("routinePlainText keeps the plain words of the task, never a command, a path or a marker", () => {
  const text = run(
    "Tu es Koffi. Relis les appels de la journée et mets à jour ta mémoire.\nLance `python3 -I /home/node/.yelema/agregation.py lire koffi` puis lis /home/node/.hermes/profiles/koffi/carte-appel.json.\nSi rien de neuf, réponds [SILENT].\nNote ce que le client a décidé."
  );
  assert.equal(routinePlainText(text), "Relis les appels de la journée et mets à jour ta mémoire.");
  // Awa's memory routine (Leslie, 28/10): its first line, never the command of step 1.
  const memory = run("Routine de mémoire, silencieuse : personne n'attend de réponse.\n1. Lance python3 -I /home/node/.yelema/agregation.py lire awa. Il te montre ce qui s'est dit.");
  assert.equal(routinePlainText(memory), "Routine de mémoire, silencieuse : personne n'attend de réponse.");
});

test("routinePlainText is null when only technical lines are left", () => {
  assert.equal(routinePlainText(run("Lance `python3 /home/node/x.py`.\nRéponds [SILENT].")), null);
});

test("upkeep routines are told apart from the work", () => {
  const r = (name: string, task: string) => ({ name, task });
  assert.equal(isUpkeep(r("Mémoire : regrouper les conversations", "Routine de mémoire, silencieuse : personne n'attend de réponse.")), true);
  assert.equal(isUpkeep(r("Rangement du soir", "Tu es Fatima. Il est 19 h 30 : range ta journée sans écrire.")), true);
  assert.equal(isUpkeep(r("Révision de la mémoire", "Tu es Djénéba. C'est le 1er du mois : révise ta mémoire.")), true);
  assert.equal(isUpkeep(r("Revision Memoire", "Note Yelema : les outils cités…")), true);
  assert.equal(isUpkeep(r("Relecture De Moi", "Note Yelema : les outils cités…")), true);
  assert.equal(isUpkeep(r("Balayage des connexions", "Tu es Mamadou. Il est 7 h : balaie tes connexions.")), true);
  assert.equal(isUpkeep(r("Origin7 - synchro inscriptions", "Synchronise les inscriptions du formulaire vers le Google Sheet.")), true);
  assert.equal(isUpkeep(r("Bilan du mois", "Tu es Djénéba. Regarde d'abord la date : si … réponds exactement `[SILENT]`.")), false);
  assert.equal(isUpkeep(r("Point de fin de journée", "Tu es Djénéba. Il est 17 h : rends ton point de fin de journée.")), false);
  assert.equal(isUpkeep(r("Novotel – demandes de devis vers le tableur", "Range les nouvelles demandes de devis dans le tableur et signale-les.")), false);
  assert.equal(isUpkeep(r("Tri Boite Mail", "Note Yelema : les outils cités…")), false);
});

test("a run titled with Hermes's own preamble is a routine run, named plainly", () => {
  const preamble = "[IMPORTANT: You are running as a scheduled cron job. DELIVERY: your final response is sent";
  assert.equal(routineOfSession({ id: "20261029_191500_ab", title: preamble, preview: "---\nname: memoire\n" }), "Routine");
  assert.equal(routineOfSession({ id: "s_1", title: "Relance des devis", preview: "Relance" }), null);
});

test("a memory routine's runs are never a conversation", () => {
  const preamble = "[IMPORTANT: You are running as a scheduled cron job.]\n\n";
  assert.equal(isMemoryRun({ id: "cron_a_1", title: "Mémoire : regrouper les conversations · Oct 29 19:18", preview: preamble }), true);
  assert.equal(isMemoryRun({ id: "x", title: null, preview: preamble + "Routine de mémoire, silencieuse : personne n'attend de réponse." }), true);
  assert.equal(isMemoryRun({ id: "cron_b_1", title: "Point du matin · Oct 29 08:00", preview: preamble + "Prépare le point du matin." }), false);
  assert.equal(isMemoryRun({ id: "s_1", title: "Mémoire de l'entreprise", preview: "Que sais-tu de nous ?" }), false);
});
