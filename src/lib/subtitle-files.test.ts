import assert from "node:assert/strict";
import { test } from "node:test";
import { isTechnicalFile } from "./drive-links.ts";
import { isDriveClutter } from "./drive-order.ts";

// Subtitle tracks an Expert makes for a video (voix.srt, sub.fr.vtt) are working files, never deliverables.
test("subtitle tracks (.srt, .vtt): hidden in Livrables, no card under a reply", () => {
  for (const n of ["voix.srt", "sub.fr.VTT"]) assert.ok(isDriveClutter({ name: n, type: "file" }), n);
  for (const n of ["~/Livrables/Fatima/pub/avatar/voix.srt", "~/Livrables/Mamadou/videos/travail/sub.fr.VTT"]) assert.ok(isTechnicalFile(n), n);
  for (const n of ["film.mp4", "Point.pdf", "pitch_v1.ogg"]) {
    assert.ok(!isDriveClutter({ name: n, type: "file" }), n);
    assert.ok(!isTechnicalFile(`~/Livrables/Fatima/${n}`), n);
  }
});
