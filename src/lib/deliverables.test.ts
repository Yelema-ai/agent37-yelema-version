import assert from "node:assert/strict";
import { test } from "node:test";
import { buildBoard, entryRole, formatLabel, humanTitle, parseDeliverableName, scanTree, shouldDescend, type TreeNode } from "./deliverables.ts";
import type { FileEntry } from "./types.ts";

const ROOT = "/home/node/Livrables/Koffi";
const file = (path: string, size = 10, modified = 1): TreeNode => ({ name: path.split("/").pop()!, path, type: "file", size, modified, hidden: false });
const dir = (path: string, children: TreeNode[] = []): TreeNode => ({ ...file(path), type: "directory", size: null, children });

test("a dated deliverable name reads as a title", () => {
  assert.equal(humanTitle("DASHBOARD_ITN15_vendredi_2026-10-16"), "Dashboard · ITN15 · vendredi 16 octobre 2026");
  assert.equal(humanTitle("RAPPORT_PLAN_COM_lundi_2026-10-12.pdf"), "Rapport · PLAN COM · lundi 12 octobre 2026");
  assert.equal(humanTitle("NOTE_Budget_2026-01-05"), "Note · Budget · lundi 5 janvier 2026");
  assert.equal(parseDeliverableName("NOTE_Budget_2026-01-05")?.date, Date.UTC(2026, 0, 5));
});

test("anything else keeps its name, without extension nor underscores", () => {
  assert.equal(humanTitle("apercu.png"), "Apercu");
  assert.equal(humanTitle("compte_rendu final.docx"), "Compte rendu final");
  assert.equal(parseDeliverableName("DASHBOARD_ITN15_2026-13-45"), null);
  assert.equal(parseDeliverableName("rapport.pdf"), null);
});

test("a file's badge comes from its extension", () => {
  assert.equal(formatLabel("a.PDF"), "PDF");
  assert.equal(formatLabel("a.xlsx"), "Tableur");
  assert.equal(formatLabel("a.pptx"), "Présentation");
  assert.equal(formatLabel("index.html"), "Page web");
  assert.equal(formatLabel("logo.png"), "Image");
  assert.equal(formatLabel("README"), "Fichier");
});

test("folders are told apart by name", () => {
  const d = (name: string) => ({ name, type: "directory" as const, hidden: false });
  assert.equal(entryRole(d("_memoire")), "memoire");
  assert.equal(entryRole(d("_inbox")), "inbox");
  assert.equal(entryRole(d("archives")), "archives");
  assert.equal(entryRole(d("Sources")), "sources");
  assert.equal(entryRole({ name: "README.md", type: "file", hidden: false }), "readme");
  assert.equal(entryRole({ name: ".DS_Store", type: "file", hidden: true }), "hidden");
  assert.equal(entryRole({ name: "sources", type: "file", hidden: false }), "content");
  assert.equal(entryRole(d("ITN15")), "content");
});

test("the scan stops at deliverables, bar their sources and archives, and never opens the journal", () => {
  assert.equal(shouldDescend([]), true);
  assert.equal(shouldDescend(["ITN15"]), true);
  assert.equal(shouldDescend(["ITN15", "DASHBOARD_ITN15_vendredi_2026-10-16"]), true);
  assert.equal(shouldDescend(["ITN15", "D", "sources"]), true);
  assert.equal(shouldDescend(["ITN15", "D", "archives"]), true);
  assert.equal(shouldDescend(["ITN15", "D", "images"]), false);
  assert.equal(shouldDescend(["ITN15", "D", "sources", "x"]), false);
  assert.equal(shouldDescend(["_memoire"]), false);
  assert.equal(shouldDescend([".git"]), false);
});

test("the board: subjects, deliverables with their main file, sources and versions apart", () => {
  const d1 = `${ROOT}/ITN15/DASHBOARD_ITN15_vendredi_2026-10-16`;
  const d0 = `${ROOT}/ITN15/NOTE_ITN15_jeudi_2026-10-15`;
  const board = buildBoard(
    dir(ROOT, [
      dir(`${ROOT}/_memoire`, [file(`${ROOT}/_memoire/jour-zero.json`)]),
      dir(`${ROOT}/_inbox`, [file(`${ROOT}/_inbox/a.txt`), file(`${ROOT}/_inbox/b.txt`)]),
      dir(`${ROOT}/ITN15`, [
        file(`${ROOT}/ITN15/README.md`),
        dir(d0, [file(`${d0}/note.docx`)]),
        dir(d1, [
          file(`${d1}/apercu.png`, 900),
          file(`${d1}/dashboard.html`, 50),
          dir(`${d1}/sources`, [file(`${d1}/sources/logo.png`), file(`${d1}/sources/page.html`)]),
          dir(`${d1}/archives`, [file(`${d1}/archives/dashboard-v1.html`)]),
        ]),
      ]),
      file(`${ROOT}/ancien-rapport.pdf`, 10, 5),
    ])
  );
  assert.deepEqual(board.inbox, { path: `${ROOT}/_inbox`, count: 2 });
  assert.equal(board.subjects.length, 1);
  const [s] = board.subjects;
  assert.equal(s.title, "ITN15");
  assert.equal(s.readme?.name, "README.md");
  assert.deepEqual(s.deliverables.map((d) => d.path), [d1, d0]);
  const [dash] = s.deliverables;
  assert.equal(dash.main?.name, "dashboard.html");
  assert.equal(dash.kind, "Page web");
  assert.deepEqual(dash.others.map((e) => e.name), ["apercu.png"]);
  assert.deepEqual(dash.sources.map((e) => e.name), ["logo.png", "page.html"]);
  assert.deepEqual(dash.archives.map((e) => e.name), ["dashboard-v1.html"]);
  assert.equal(s.updated, Date.UTC(2026, 9, 16));
  assert.deepEqual(board.loose.map((d) => [d.title, d.kind, d.isFolder]), [["Ancien-rapport", "PDF", false]]);
});

test("an empty inbox and a dated folder at the top level", () => {
  const top = `${ROOT}/RAPPORT_X_lundi_2026-10-12`;
  const board = buildBoard(dir(ROOT, [dir(`${ROOT}/_inbox`), dir(top)]));
  assert.equal(board.inbox, null);
  assert.equal(board.subjects.length, 0);
  assert.equal(board.loose[0].kind, "Rapport");
  assert.equal(board.loose[0].main, null);
});

test("the scan lists level by level and stays within its budget", async () => {
  const listings: Record<string, FileEntry[]> = {
    [ROOT]: [dir(`${ROOT}/S`), dir(`${ROOT}/_memoire`)],
    [`${ROOT}/S`]: [dir(`${ROOT}/S/D`)],
    [`${ROOT}/S/D`]: [file(`${ROOT}/S/D/x.pdf`), dir(`${ROOT}/S/D/sources`), dir(`${ROOT}/S/D/other`)],
    [`${ROOT}/S/D/sources`]: [file(`${ROOT}/S/D/sources/a.png`)],
  };
  const asked: string[] = [];
  const { tree, complete } = await scanTree(dir(ROOT), async (p) => {
    asked.push(p);
    if (!listings[p]) throw new Error(`unexpected ${p}`);
    return listings[p];
  });
  assert.equal(complete, true);
  assert.deepEqual(asked, [ROOT, `${ROOT}/S`, `${ROOT}/S/D`, `${ROOT}/S/D/sources`]);
  assert.equal(buildBoard(tree).subjects[0].deliverables[0].sources.length, 1);
});
