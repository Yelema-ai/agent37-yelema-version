import assert from "node:assert/strict";
import { test } from "node:test";
import { TOPIC_ICONS, TOPIC_ICONS_PY } from "./telegram-topic-icons.ts";

test("one distinct Telegram icon id per expert, readable as a Python dict", () => {
  const experts = ["adjoua", "alioune", "awa", "djeneba", "fatima", "fatou", "ibrahim", "koffi", "kouassi", "mamadou", "nadia", "salif", "yele"];
  assert.deepEqual(Object.keys(TOPIC_ICONS).sort(), experts);
  assert.equal(new Set(Object.values(TOPIC_ICONS)).size, experts.length);
  assert.ok(Object.values(TOPIC_ICONS).every((id) => /^\d{19}$/.test(id)));
  assert.deepEqual(JSON.parse(TOPIC_ICONS_PY), TOPIC_ICONS);
});
