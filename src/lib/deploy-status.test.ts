import assert from "node:assert/strict";
import { test } from "node:test";

import { deployPhase, parseDeployStatus } from "./deploy-status.ts";

test("nothing to show while the version holds and no update runs", () => {
  assert.equal(deployPhase("abc", { version: "abc", maintenance: false }), "idle");
  assert.equal(deployPhase(null, null), "idle");
});

test("an update in progress wins, even once the new version is out", () => {
  assert.equal(deployPhase("abc", { version: "abc", maintenance: true }), "maintenance");
  assert.equal(deployPhase("abc", { version: "def", maintenance: true }), "maintenance");
});

test("a new version after the update asks to refresh, not before the first reading", () => {
  assert.equal(deployPhase("abc", { version: "def", maintenance: false }), "updated");
  assert.equal(deployPhase(null, { version: "def", maintenance: false }), "idle");
});

test("only a well-formed answer counts", () => {
  assert.deepEqual(parseDeployStatus({ version: "v1", maintenance: true }), { version: "v1", maintenance: true });
  assert.deepEqual(parseDeployStatus({ version: "v1", maintenance: "yes" }), { version: "v1", maintenance: false });
  assert.equal(parseDeployStatus({ maintenance: true }), null);
  assert.equal(parseDeployStatus("<html>"), null);
  assert.equal(parseDeployStatus(null), null);
});
