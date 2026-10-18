import { test } from "node:test";
import assert from "node:assert/strict";
import { expertThemes } from "./expert-themes.ts";

const fallback = [
  { key: "direction", label: "Direction", experts: ["djeneba"] },
  { key: "ventes", label: "Ventes & Relation client", experts: ["kouassi", "awa"] },
  { key: "legal", label: "Légal", experts: ["ibrahim"] },
];
const e = (key: string, name: string, category: { key: string; label: string } | null = null) => ({ key, name, category });

test("the stopgap list files the experts while the back office files only some", () => {
  const r = expertThemes([], [e("djeneba", "Djénéba"), e("kouassi", "Kouassi"), e("x1", "Awa"), e("ibrahim", "Ibrahim", { key: "jur", label: "Juridique" })], fallback);
  assert.deepEqual(r.themes, [
    { key: "direction", label: "Direction", count: 1 },
    { key: "ventes", label: "Ventes & Relation client", count: 2 },
    { key: "legal", label: "Légal", count: 1 },
  ]);
  assert.equal(r.themeOf.get("x1"), "ventes");
});

test("an expert the list does not name keeps the back office's category; one with neither has none", () => {
  const r = expertThemes([], [e("djeneba", "Djénéba"), e("zoe", "Zoé", { key: "data", label: "Données" }), e("nobody", "Personne")], fallback);
  assert.deepEqual(r.themes.map((t) => t.key), ["direction", "data"]);
  assert.equal(r.themeOf.has("nobody"), false);
});

test("the back office wins once it files every expert, in its own order", () => {
  const cats = [{ key: "b", label: "B" }, { key: "a", label: "A" }];
  const r = expertThemes(cats, [e("djeneba", "Djénéba", { key: "a", label: "A" }), e("kouassi", "Kouassi", { key: "b", label: "B" })], fallback);
  assert.deepEqual(r.themes.map((t) => t.key), ["b", "a"]);
});
