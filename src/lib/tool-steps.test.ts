import assert from "node:assert/strict";
import { test } from "node:test";
import { GENERIC_STEP, stepDone, toolPhrase } from "./tool-steps.ts";

test("built-in tools read as plain French", () => {
  assert.equal(toolPhrase("web_search"), "Recherche sur le web…");
  assert.equal(toolPhrase("web_extract"), "Lit une page web…");
  assert.equal(toolPhrase("memory"), "Met à jour sa mémoire…");
  assert.equal(toolPhrase("read_file"), "Parcourt ses dossiers…");
  assert.equal(toolPhrase("terminal"), "Prépare un document…");
  assert.equal(toolPhrase("delegate_task"), "Confie une partie du travail…");
  assert.equal(toolPhrase("browser_navigate"), "Navigue sur le web…");
});

test("a skill is a method, or the rules of the job", () => {
  assert.equal(toolPhrase("skill_view", { name: "relance-impayes" }), "Consulte sa méthode…");
  assert.equal(toolPhrase("skill_view", { name: "regles-du-poste" }), "Ouvre ses règles du poste…");
});

test("the company memory, whatever the MCP naming", () => {
  assert.equal(toolPhrase("mcp__memoire__demander"), "Consulte la mémoire de l’entreprise…");
  assert.equal(toolPhrase("mcp_memoire_rechercher"), "Consulte la mémoire de l’entreprise…");
});

test("connected apps name the app they reach", () => {
  assert.equal(toolPhrase("mcp__apps__COMPOSIO_EXECUTE_TOOL", { tool_slug: "GOOGLECALENDAR_EVENTS_LIST" }), "Consulte l’agenda…");
  assert.equal(toolPhrase("mcp__apps__COMPOSIO_MULTI_EXECUTE_TOOL", { tools: [{ tool_slug: "GMAIL_FETCH_EMAILS" }] }), "Lit les e-mails…");
  assert.equal(toolPhrase("COMPOSIO_EXECUTE_TOOL", { tool_slug: "GOOGLEDRIVE_FIND_FILE" }), "Ouvre Google Drive…");
  assert.equal(toolPhrase("mcp__apps__COMPOSIO_SEARCH_TOOLS"), "Cherche le bon outil connecté…");
  assert.equal(toolPhrase("mcp__apps__COMPOSIO_MULTI_EXECUTE_TOOL"), "Utilise un outil connecté…");
  assert.equal(toolPhrase("mcp__client-crm__find"), "Utilise un outil connecté…");
});

test("an unknown tool never shows its name", () => {
  assert.equal(toolPhrase("some_new_tool"), GENERIC_STEP);
  assert.equal(stepDone("Recherche sur le web…"), "Recherche sur le web");
});
