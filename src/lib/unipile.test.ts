import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDsn, parseUnipileDraft } from "./unipile.ts";

const KEY = "Kx7pQ2.abcdefghijklmnop=";

test("DSN collé avec schéma ou chemin ; tout autre hôte refusé", () => {
  assert.equal(normalizeDsn(" https://API8.unipile.com:13851/api/v1 "), "api8.unipile.com:13851");
  assert.equal(normalizeDsn("api8.unipile.com.evil.io:1"), null);
});

test("brouillon : clé au bon format et au moins un expert", () => {
  assert.deepEqual(parseUnipileDraft({ dsn: "api8.unipile.com:13851", apiKey: ` ${KEY} `, experts: ["djeneba", "djeneba", "../x"] }), { dsn: "api8.unipile.com:13851", apiKey: KEY, experts: ["djeneba"] });
  assert.equal(parseUnipileDraft({ dsn: "api8.unipile.com", apiKey: KEY, experts: [] }), null);
  assert.equal(parseUnipileDraft({ dsn: "api8.unipile.com", apiKey: "court", experts: ["djeneba"] }), null);
});
