import assert from "node:assert/strict";
import { test } from "node:test";
import { fileLabel, isMemberUpload } from "./drive-paths.ts";

const R = "/home/node/Livrables";

test("what the member brought is told apart from what an Expert made", () => {
  assert.equal(isMemberUpload(`${R}/Pièces jointes/18om3i4g-facture.pdf`), true);
  assert.equal(isMemberUpload("~/Livrables/Pièces jointes/x.pdf"), true);
  assert.equal(isMemberUpload(`${R}/Fatima/Reçus/brief.pdf`), true);
  assert.equal(isMemberUpload(`${R}/Fatima/Recus/brief.pdf`), true);
  assert.equal(isMemberUpload(`${R}/Fatima/Newsletter/newsletter.pdf`), false);
  assert.equal(isMemberUpload(`${R}/Fatima/Reçus de caisse 2026.pdf`), false);
});

test("an attachment shows its original name, any other file its own", () => {
  assert.equal(fileLabel({ name: "18om3i4g-110_photo_hpl.jpg", path: `${R}/Pièces jointes/18om3i4g-110_photo_hpl.jpg` }), "110_photo_hpl.jpg");
  assert.equal(fileLabel({ name: "8jpohjsp-BLOK · Rapport (v2).pptx", path: `${R}/Pièces jointes/8jpohjsp-BLOK · Rapport (v2).pptx` }), "BLOK · Rapport (v2).pptx");
  // A deliverable whose name happens to start like a prefix keeps it.
  assert.equal(fileLabel({ name: "planning-q4.pdf", path: `${R}/Djénéba/planning-q4.pdf` }), "planning-q4.pdf");
});
