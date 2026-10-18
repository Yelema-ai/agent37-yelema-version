import assert from "node:assert/strict";
import { test } from "node:test";
import { isMemoryFolder, sortDriveEntries } from "./drive-order.ts";

const e = (name: string, modified: number, type = "file") => ({ name, modified, type });

test("the memory folder is recognised whatever its case, accents or leading underscore", () => {
  for (const n of ["memoire", "Mémoire", "MEMORY", "_memoire", "mémoire"]) assert.equal(isMemoryFolder(n), true, n);
  for (const n of ["memoires", "Mémo", "notes"]) assert.equal(isMemoryFolder(n), false, n);
});

test("memory first, then newest first with folders and files mixed, undated last by name", () => {
  const out = sortDriveEntries([
    e("ancien.pdf", 100),
    e("Clients", 300, "directory"),
    e("zeta.txt", 0),
    e("Mémoire", 50, "directory"),
    e("rapport.xlsx", 500),
    e("alpha.txt", 0),
  ]).map((x) => x.name);
  assert.deepEqual(out, ["Mémoire", "rapport.xlsx", "Clients", "ancien.pdf", "alpha.txt", "zeta.txt"]);
});

test("a file named like the memory folder is not pinned", () => {
  assert.deepEqual(sortDriveEntries([e("memoire", 1), e("b.pdf", 2)]).map((x) => x.name), ["b.pdf", "memoire"]);
});
