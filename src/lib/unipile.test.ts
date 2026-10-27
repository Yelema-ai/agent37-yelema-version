import assert from "node:assert/strict";
import { test } from "node:test";
import { accountBroken, accountName, accountType, normalizeDsn, parseUnipileDraft } from "./unipile.ts";

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

test("an account reads as people say it, and a lost session asks to be linked again", () => {
  assert.equal(accountName({ type: "WHATSAPP", name: "22597714432" }), "+225 97 71 44 32");
  assert.equal(accountName({ type: "WHATSAPP", name: "2250702219778" }), "+225 07 02 21 97 78");
  assert.equal(accountName({ type: "WHATSAPP", name: "33612345678" }), "+33612345678");
  assert.equal(accountName({ type: "LINKEDIN", name: "Leslie Ossete" }), "Leslie Ossete");
  assert.equal(accountType("WHATSAPP"), "WhatsApp");
  assert.equal(accountType("SLACK"), "Slack");
  assert.equal(accountBroken({ status: "CREDENTIALS" }), true);
  assert.equal(accountBroken({ status: "OK" }), false);
  assert.equal(accountBroken({ status: null }), false);
});
