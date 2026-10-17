import assert from "node:assert/strict";
import { test } from "node:test";
import { batchQueued, FOLLOW_UP_HEADER, insertBefore, steerText, unreadSteerCount } from "./chat-queue.ts";

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

test("pending_steer covers the latest steers only", () => {
  assert.equal(unreadSteerCount(["a", "b", "c"], "b\nc"), 2);
  assert.equal(unreadSteerCount(["a", " c "], "c"), 1);
  assert.equal(unreadSteerCount(["a"], "autre chose"), 0);
  assert.equal(unreadSteerCount([], "x"), 0);
});

test("a stored steer shows as the user's own words", () => {
  const stored = "[OUT-OF-BAND USER MESSAGE — a direct message from the user, delivered once]\nAjoute la date\n[/OUT-OF-BAND USER MESSAGE]";
  assert.equal(steerText(stored), "Ajoute la date");
  assert.equal(steerText("Bonjour"), "Bonjour");
});

test("a message sent during a reply sits before that reply; with no reply on screen, at the end", () => {
  const list = [{ id: "u1" }, { id: "a1" }];
  assert.deepEqual(insertBefore(list, "a1", { id: "u2" }).map((m) => m.id), ["u1", "u2", "a1"]);
  assert.deepEqual(insertBefore(list, "zz", { id: "u2" }).map((m) => m.id), ["u1", "a1", "u2"]);
});
