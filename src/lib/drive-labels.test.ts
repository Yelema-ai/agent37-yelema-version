import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverableNotice, fileLabel, isMemberUpload } from "./drive-paths.ts";

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

test("a new deliverable names its Expert, and a scratch file is not one", () => {
  assert.deepEqual(deliverableNotice({ name: "Plan Q4.pdf", path: "/home/node/Livrables/Djénéba/Plans/Plan Q4.pdf" }), {
    title: "Nouveau livrable de Djénéba",
    folder: "/home/node/Livrables/Djénéba/Plans",
  });
  assert.equal(deliverableNotice({ name: "Note.docx", path: "/home/node/Livrables/Note.docx" })?.title, "Nouveau livrable");
  assert.equal(deliverableNotice({ name: "s.html", path: "/home/node/Livrables/Djénéba/s.html" }), null);
  assert.equal(deliverableNotice({ name: "tmp_rapport.md", path: "/home/node/Livrables/Djénéba/tmp_rapport.md" }), null);
});
