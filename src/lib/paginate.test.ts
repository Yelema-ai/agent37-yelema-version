import assert from "node:assert/strict";
import { test } from "node:test";
import { paginate } from "./paginate.ts";

const list = Array.from({ length: 12 }, (_, i) => i + 1);

test("a page and its bounds", () => {
  assert.deepEqual(paginate(list, 2, 5), { items: [6, 7, 8, 9, 10], page: 2, pages: 3, from: 6, to: 10 });
  assert.deepEqual(paginate(list, 3, 5).items, [11, 12]);
});

test("the page is clamped into range", () => {
  assert.equal(paginate(list, 9, 5).page, 3);
  assert.equal(paginate(list, 0, 5).page, 1);
  assert.equal(paginate(list, Number.NaN, 5).page, 1);
});

test("an empty list is one empty page", () => {
  assert.deepEqual(paginate([], 4, 10), { items: [], page: 1, pages: 1, from: 0, to: 0 });
});
