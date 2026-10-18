import { test } from "node:test";
import assert from "node:assert/strict";
import { expertThemes } from "./expert-themes.ts";

const e = (key: string, name: string, category: { key: string; label: string } | null = null) => ({ key, name, category });

test("themes follow the back office's categories, in its order", () => {
  const cats = [{ key: "b", label: "B" }, { key: "a", label: "A" }];
  const r = expertThemes(cats, [e("djeneba", "Djénéba", { key: "a", label: "A" }), e("kouassi", "Kouassi", { key: "b", label: "B" })]);
  assert.deepEqual(r.themes, [
    { key: "b", label: "B", count: 1 },
    { key: "a", label: "A", count: 1 },
  ]);
});

test("a category the ordered list lacks comes after it; an expert without one is under no theme; an empty theme is not shown", () => {
  const r = expertThemes([{ key: "a", label: "A" }, { key: "vide", label: "Vide" }], [e("x", "X", { key: "z", label: "Z" }), e("y", "Y", { key: "a", label: "A" }), e("nobody", "Personne")]);
  assert.deepEqual(r.themes.map((t) => t.key), ["a", "z"]);
  assert.equal(r.themeOf.has("nobody"), false);
});
