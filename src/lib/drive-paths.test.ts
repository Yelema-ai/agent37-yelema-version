import assert from "node:assert/strict";
import { test } from "node:test";
import { seatFolderOf } from "./drive-paths.ts";

test("chat d'entreprise : seul un dossier d'agent u-… en tête est reconnu", () => {
  assert.equal(seatFolderOf(["u-abc123", "Notes"]), "u-abc123");
  for (const parts of [["Djeneba"], ["Notes", "u-abc123"], ["u-ABC123"], ["u-abc12"], []]) assert.equal(seatFolderOf(parts), undefined, parts.join("/"));
});
