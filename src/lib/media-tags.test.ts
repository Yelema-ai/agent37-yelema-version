import assert from "node:assert/strict";
import { test } from "node:test";
import { mediaTags } from "./media-tags.ts";

test("MEDIA lines are hidden, their Livrables files kept in order", () => {
  const reply = [
    "Voici le tableau de bord.",
    "",
    "MEDIA:/home/node/Livrables/Djeneba/Mstudio/apercu.png",
    "MEDIA:Livrables/Djeneba/Mstudio/2026-10-25_tableau direction.pdf",
    "- **MEDIA:~/Livrables/Djeneba/Mstudio/apercu.png**",
    "MEDIA:/tmp/cache/vignette.png",
    "Bonne lecture.",
  ].join("\n");
  const { text, paths } = mediaTags(reply);
  assert.equal(text, "Voici le tableau de bord.\n\nBonne lecture.");
  assert.deepEqual(paths, ["~/Livrables/Djeneba/Mstudio/apercu.png", "~/Livrables/Djeneba/Mstudio/2026-10-25_tableau direction.pdf"]);
});

test("a tag inside a sentence goes, the sentence stays", () => {
  const { text, paths } = mediaTags("Le devis est prêt : MEDIA:~/Livrables/Kouassi/devis.pdf, à relire.");
  assert.equal(text, "Le devis est prêt : , à relire.");
  assert.deepEqual(paths, ["~/Livrables/Kouassi/devis.pdf"]);
});

test("a tag still being written never flashes, a path escaping Livrables is dropped", () => {
  assert.equal(mediaTags("Voici.\nMEDIA:/home/no").text, "Voici.");
  assert.deepEqual(mediaTags("MEDIA:~/Livrables/../.yelema/cle.pdf").paths, []);
  assert.deepEqual(mediaTags("Sans pièce jointe."), { text: "Sans pièce jointe.", paths: [] });
});
