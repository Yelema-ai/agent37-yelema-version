import assert from "node:assert/strict";
import { test } from "node:test";
import { docKind, drivePathsIn, normDrivePath, turnDocs, turnWindow } from "./drive-links.ts";

test("the paths a reply names, in order, once each, in one spelling", () => {
  const text = [
    "Voici le devis : `~/Livrables/Kouassi/Devis Yao.pdf`",
    "et le [tableau](file:///home/node/Livrables/Kouassi/pipeline.xlsx).",
    "Rappel : /home/node/Livrables/Kouassi/pipeline.xlsx",
    "[note](<sandbox:/home/node/Livrables/Kouassi/Note de visite.docx>)",
  ].join("\n");
  assert.deepEqual(drivePathsIn(text), ["~/Livrables/Kouassi/Devis Yao.pdf", "~/Livrables/Kouassi/pipeline.xlsx", "~/Livrables/Kouassi/Note de visite.docx"]);
  assert.equal(normDrivePath("/home/node/Livrables/A%20B.pdf"), "~/Livrables/A B.pdf");
});

test("formats", () => {
  assert.deepEqual(["a.PDF", "b.xlsx", "c.docx", "d.pptx", "e.png", "f.zip"].map(docKind), ["pdf", "excel", "word", "powerpoint", "image", "other"]);
});

test("a turn runs from its question to its reply", () => {
  const m = [
    { role: "user", at: 1_000_000 },
    { role: "assistant", at: 1_100_000 },
    { role: "user", at: 2_000_000 },
    { role: "assistant", at: 2_300_000 },
  ];
  assert.deepEqual(turnWindow(m, 3, 9e9), { start: 1_995_000, end: 2_305_000 });
  // A turn stamped at its end: it starts after the previous reply.
  const same = [{ role: "assistant", at: 1_900_000 }, { role: "user", at: 2_300_000 }, { role: "assistant", at: 2_300_000 }];
  assert.deepEqual(turnWindow(same, 2, 9e9), { start: 1_895_000, end: 2_305_000 });
  // While it is written, it ends now.
  assert.equal(turnWindow([{ role: "user", at: 10_000 }, { role: "assistant" }], 1, 50_000).end, 55_000);
});

test("cards: the named files, then the files written during the turn, never the memory", () => {
  const listing = [
    { name: "Devis Yao.pdf", path: "/home/node/Livrables/Kouassi/Devis Yao.pdf", type: "file", size: 2048, modified: 100 },
    { name: "pipeline.xlsx", path: "/home/node/Livrables/Kouassi/pipeline.xlsx", type: "file", size: 4096, modified: 2_100 },
    { name: "ancien.docx", path: "/home/node/Livrables/Kouassi/ancien.docx", type: "file", size: 1, modified: 50 },
    { name: "notes.md", path: "/home/node/Livrables/Kouassi/Mémoire/notes.md", type: "file", size: 1, modified: 2_050 },
    { name: "Clients", path: "/home/node/Livrables/Kouassi/Clients", type: "directory", size: null, modified: 2_000 },
  ];
  const docs = turnDocs("Le devis : `~/Livrables/Kouassi/Devis Yao.pdf`", listing, { start: 2_000, end: 3_000 });
  assert.deepEqual(
    docs.map((d) => [d.name, d.size, d.kind]),
    [
      ["Devis Yao.pdf", 2048, "pdf"],
      ["pipeline.xlsx", 4096, "excel"],
    ]
  );
  // Without a listing, the named files alone.
  assert.deepEqual(turnDocs("`~/Livrables/X/a.pdf`", [], { start: 0, end: 1 }).map((d) => d.path), ["~/Livrables/X/a.pdf"]);
});

test("cards: a named file missing from a listed folder is made up, elsewhere it is kept", () => {
  const listing = [{ name: "Devis.pdf", path: "/home/node/Livrables/Kouassi/Devis.pdf", type: "file", size: 10, modified: 1 }];
  const text = "`~/Livrables/Kouassi/Inventé.pdf` et `~/Livrables/Archives/2025/export.pdf`";
  assert.deepEqual(turnDocs(text, listing, { start: 5, end: 6 }).map((d) => d.path), ["~/Livrables/Archives/2025/export.pdf"]);
});

test("turnDocs shows no card for a working file (JSON, script, log)", () => {
  const listing = [
    { path: "Livrables/Kouassi/etat.json", type: "file" as const, hidden: false, modified: 50, size: 10, name: "etat.json" },
    { path: "Livrables/Kouassi/calcul.py", type: "file" as const, hidden: false, modified: 50, size: 10, name: "calcul.py" },
    { path: "Livrables/Kouassi/Point.pdf", type: "file" as const, hidden: false, modified: 50, size: 10, name: "Point.pdf" },
  ];
  const docs = turnDocs("Voir Livrables/Kouassi/etat.json", listing as never, { start: 0, end: 100 });
  assert.deepEqual(docs.map((d) => d.name), ["Point.pdf"]);
});
