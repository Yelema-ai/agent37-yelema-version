import assert from "node:assert/strict";
import { test } from "node:test";
import { boundedCache, isThumbable, thumbWidth } from "./thumbs.ts";

test("seules les images ont une vignette, à une largeur de la liste", () => {
  assert.ok(isThumbable("~/Livrables/Koffi/affiche.PNG") && isThumbable("a/b.jpeg") && isThumbable("x.webp"));
  assert.ok(!isThumbable("logo.svg") && !isThumbable("page.html") && !isThumbable("rapport.pdf"));
  assert.equal(thumbWidth("300"), 480);
  assert.equal(thumbWidth("960"), 960);
  assert.equal(thumbWidth("1000"), 1600);
  assert.equal(thumbWidth("99999"), 1600);
  assert.equal(thumbWidth(null), 480);
  assert.equal(thumbWidth("abc"), 1600);
});

const buf = (n: number) => new Uint8Array(n);

test("cache borné : un seul calcul pour deux demandes simultanées, puis servi depuis la mémoire", async () => {
  const cache = boundedCache<Uint8Array>(1000, 60_000);
  let made = 0;
  const make = async () => (made++, buf(100));
  const [a, b] = await Promise.all([cache.get("k", make), cache.get("k", make)]);
  assert.equal(a, b);
  await cache.get("k", make);
  assert.equal(made, 1);
  assert.equal(cache.size, 100);
});

test("cache borné : les plus anciennes sortent au-delà de la taille, rien au-delà de la durée", async () => {
  let t = 0;
  const cache = boundedCache<Uint8Array>(250, 1000, () => t);
  let made = 0;
  const make = async () => (made++, buf(100));
  await cache.get("a", make);
  await cache.get("b", make);
  await cache.get("c", make);
  assert.equal(cache.size, 200);
  await cache.get("b", make);
  assert.equal(made, 3);
  await cache.get("a", make);
  assert.equal(made, 4);
  t = 5000;
  await cache.get("a", make);
  assert.equal(made, 5);
  await cache.get("trop", async () => buf(10_000));
  assert.ok(cache.size <= 250);
});

test("cache borné : un échec n'est pas gardé", async () => {
  const cache = boundedCache<Uint8Array>(1000, 60_000);
  await assert.rejects(cache.get("k", async () => Promise.reject(new Error("instance"))));
  assert.equal((await cache.get("k", async () => buf(5))).byteLength, 5);
});
