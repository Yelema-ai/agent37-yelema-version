import assert from "node:assert/strict";
import { test } from "node:test";
import { batchQueued, FOLLOW_UP_HEADER } from "./chat-queue.ts";

test("one message goes out as it is", () => {
  assert.deepEqual(batchQueued([{ text: " Bonjour ", files: ["/a"] }]), { text: "Bonjour", files: ["/a"] });
});

test("several messages become one turn, in order, under a header, files merged once", () => {
  const out = batchQueued([
    { text: "Ajoute le budget", files: ["/a.pdf"] },
    { text: "", files: ["/b.png", "/a.pdf"] },
    { text: "Et la date", files: [] },
  ]);
  assert.equal(out.text, `${FOLLOW_UP_HEADER}\n\nAjoute le budget\n\nEt la date`);
  assert.deepEqual(out.files, ["/a.pdf", "/b.png"]);
});

test("files alone send no text", () => {
  assert.deepEqual(batchQueued([{ text: "", files: ["/a"] }, { text: " ", files: ["/b"] }]), { text: "", files: ["/a", "/b"] });
});
