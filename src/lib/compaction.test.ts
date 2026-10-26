import assert from "node:assert/strict";
import { test } from "node:test";
import { isCompactionSummary, visibleHistory } from "./compaction.ts";

test("a compaction summary is never a message, one marker per compaction", () => {
  const rows = [
    { role: "user", content: "Le deck SIREXE" },
    { role: "system", content: "📚 La conversation devenait longue…" },
    { role: "assistant", content: "[PRIOR CONTEXT — for reference only; not a new message]\n\n[CONTEXT COMPACTION — REFERENCE ONLY] …Livrables/Koffi/_memoire/brief.md" },
    { role: "system", content: "📚 La conversation devenait longue…" },
    { role: "user", content: "[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted" },
    { role: "assistant", content: "La version 4 est prête." },
  ];
  assert.deepEqual(visibleHistory(rows).map((r) => r.role), ["user", "system", "assistant"]);
  assert.ok(isCompactionSummary("This session is being continued from a previous conversation that ran out of context."));
  assert.ok(!isCompactionSummary("Voici le résumé de la réunion."));
});
