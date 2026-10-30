import assert from "node:assert/strict";
import { test } from "node:test";
import { chatLayout } from "./chat-layout.ts";

test("a report written one idea per line keeps its lines and its rules", () => {
  const report = [
    "🌙 POINT DE FIN DE JOURNÉE · vendredi 30 octobre ──────────────",
    "",
    "📡 MTN Côte d'Ivoire : support client",
    "✅ 6 réponses clients rédigées, sans envoi",
    "🔗 [Ouvrir le manuel des conseillers](https://example.org/manuel)",
    "⏭️ Lundi 2 novembre : j'ajuste le manuel",
    "",
    "────────────── 💬 Une tâche pour la nuit ?",
  ].join("\n");
  assert.equal(
    chatLayout(report),
    [
      "🌙 POINT DE FIN DE JOURNÉE · vendredi 30 octobre",
      "",
      "---",
      "",
      "📡 MTN Côte d'Ivoire : support client  ",
      "✅ 6 réponses clients rédigées, sans envoi  ",
      "[**Ouvrir le manuel des conseillers**](https://example.org/manuel)  ",
      "⏭️ Lundi 2 novembre : j'ajuste le manuel",
      "",
      "---",
      "",
      "💬 Une tâche pour la nuit ?",
    ].join("\n")
  );
});

test("code, tables, lists and links in a sentence are left as they are", () => {
  const code = "```\nligne 1\nligne 2\n```";
  assert.equal(chatLayout(code), code);
  const table = "| a | b |\n| - | - |\n| 1 | 2 |";
  assert.equal(chatLayout(table), table);
  assert.equal(chatLayout("Voici :\n- un\n- deux"), "Voici :\n- un\n- deux");
  assert.equal(chatLayout("Le [rapport](https://x.org) est prêt."), "Le [rapport](https://x.org) est prêt.");
  assert.equal(chatLayout("Titre\n---"), "Titre\n---");
});
