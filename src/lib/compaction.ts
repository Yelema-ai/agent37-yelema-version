// A long conversation is compacted by its runtime: the summary it writes for itself is never a message, and
// each compaction shows as one marker line. No imports, for `node --test`.

const SUMMARY = /^\s*(\[(CONTEXT COMPACTION|PRIOR CONTEXT|CONTEXT SUMMARY)\b|This session is being continued from a previous conversation)/i;

export const isCompactionSummary = (content: string): boolean => SUMMARY.test(content);

/** The rows a thread shows: summaries out, back-to-back markers folded into one. */
export function visibleHistory<T extends { role: string; content: string }>(rows: readonly T[]): T[] {
  const out: T[] = [];
  for (const row of rows) {
    if (isCompactionSummary(row.content ?? "")) continue;
    if (row.role === "system" && out.at(-1)?.role === "system") continue;
    out.push(row);
  }
  return out;
}
