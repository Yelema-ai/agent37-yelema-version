import assert from "node:assert/strict";
import { test } from "node:test";
import { replyLines } from "./reply-lines.ts";

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
    replyLines(report),
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
  assert.equal(replyLines(code), code);
  const table = "| a | b |\n| - | - |\n| 1 | 2 |";
  assert.equal(replyLines(table), table);
  assert.equal(replyLines("Voici :\n- un\n- deux"), "Voici :\n- un\n- deux");
  assert.equal(replyLines("Le [rapport](https://x.org) est prêt."), "Le [rapport](https://x.org) est prêt.");
  assert.equal(replyLines("Titre\n---"), "Titre\n---");
});
