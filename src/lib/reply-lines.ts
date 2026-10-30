// An Expert writes its reports for Telegram: one idea per line, an emoji at the head of each, rules drawn
// with « ──── », a « 🔗 » before each link. Markdown glues single lines into one paragraph and keeps the
// rules as text: the report read as a wall (Leslie, 30/10). Before rendering: each line stays a line, a
// drawn rule becomes a real one, and a link that is an action (« 🔗 Ouvrir le manuel ») becomes a button
// (its label in bold, which the chat's style shows as a button). Code blocks and tables are left as they
// are. No imports: tested.

const FENCE = /^\s*(```|~~~)/;
// Drawn rules only: markdown's own (« --- », « === » under a title) are left to it.
const RULE_ONLY = /^\s*[─━═—–]{3,}\s*$/;
const RULE_END = /\s*[─━═—]{3,}\s*$/;
const RULE_START = /^\s*[─━═—]{3,}\s*/;
const TABLE = /^\s*\|/;
// A line markdown already keeps apart: a heading, a list item, a quote, a table row.
const BLOCK = /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|>|\||(-{3,}|={3,})\s*$)/;
// « 🔗 [Ouvrir le manuel](url) »: the emoji goes, the link becomes an action.
// « 🌙 POINT DE FIN DE JOURNÉE · vendredi » : a section title written in capitals, bold, so the
// report's parts stand out (Leslie, 30/10). Up to a « · », a « : » or the end of the line.
const CAPS_TITLE = /^([^\p{L}*]*?)(\p{Lu}[\p{Lu}\s'’]{4,}\p{Lu})(?=\s*(?:·|:|$))/u;
// « … sur Yelema : • Yelema est née… • Les Experts… »: bullets written inside the sentence (Leslie,
// 30/10). Each « • » starts a list item on its own line; a sentence holding a single one is left be.
const INLINE_BULLET = /\s+•\s+/;
// « quel est son rôle ? A. Il construit… B. Il est surtout… »: options in the sentence. With an A and
// a B on the line, each option goes on its own line, its letter in bold.
const OPTION = /(^|\s)([A-E])[.)]\s+(?=\p{Lu})/gu;
const LIST_MARKER = /^(\s*)(\d+[.)]|[-*+])\s+/;
const ACTION_LINK = /(?:🔗\s*)?\[((?:Ouvrir|Télécharger|Voir|Consulter|Lire|Écouter|Valider|Répondre)\b[^\]\n]*)\]\(([^)\s]+)\)/g;

export function replyLines(text: string): string {
  const out: string[] = [];
  let fenced = false;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (FENCE.test(line)) fenced = !fenced;
    if (fenced || FENCE.test(line)) {
      out.push(line);
      continue;
    }
    if (RULE_ONLY.test(line)) {
      out.push("", "---", "");
      continue;
    }
    let after = false;
    if (RULE_START.test(line)) {
      out.push("", "---", "");
      line = line.replace(RULE_START, "");
    }
    if (RULE_END.test(line)) {
      line = line.replace(RULE_END, "");
      after = true;
    }
    if (line.split(INLINE_BULLET).length > 2) {
      const [head, ...items] = line.split(INLINE_BULLET);
      out.push(head.replace(/\s+$/, ""), "", ...items.map((t) => `- ${t.trim()}`), "");
      continue;
    }
    line = splitOptions(line);
    line = line.replace(CAPS_TITLE, (_m, head: string, title: string) => `${head}**${title}**`);
    line = line.replace(ACTION_LINK, (_m, label: string, url: string) => `[**${label}**](${url})`);
    const next = lines[i + 1];
    // A line followed by another line of text keeps its end: a hard break, not a space.
    const keepEnd = line.trim() && next !== undefined && next.trim() && !after && !TABLE.test(line) && !BLOCK.test(next) && !FENCE.test(next) && !RULE_ONLY.test(next) && !RULE_START.test(next);
    out.push(keepEnd ? `${line.replace(/\s+$/, "")}  ` : line);
    if (after) out.push("", "---", "");
  }
  const joined = out.join("\n").replace(/\n{3,}/g, "\n\n");
  return text.endsWith("\n") ? joined : joined.replace(/\n+$/, "");
}

function splitOptions(line: string): string {
  const letters = [...line.matchAll(OPTION)].map((m) => m[2]);
  if (!letters.includes("A") || !letters.includes("B")) return line;
  // Inside a list item, the next lines keep the item's indent.
  const marker = LIST_MARKER.exec(line);
  const indent = marker ? " ".repeat(marker[0].length) : "";
  return line.replace(OPTION, (_m, before: string, letter: string) => (before === "" ? `**${letter}.** ` : `  \n${indent}**${letter}.** `));
}
