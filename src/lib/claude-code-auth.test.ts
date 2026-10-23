import assert from "node:assert/strict";
import { test } from "node:test";
import { CLAUDE_CODE_RE, describeClaudeAuth, safeLoginUrl } from "./claude-code-auth.ts";

const auth = { loggedIn: true, method: "claude.ai", email: "a@b.ci", plan: "max" };

test("la clé passe devant l’abonnement ; l’abonnement nomme son forfait", () => {
  assert.equal(describeClaudeAuth({ auth, key: true, login: null }), "Clé API Anthropic");
  assert.equal(describeClaudeAuth({ auth, key: false, login: null }), "Claude Max · a@b.ci");
  assert.equal(describeClaudeAuth({ auth: { loggedIn: false, method: "none", email: null, plan: null }, key: false, login: null }), "Aucun modèle connecté");
});

test("seule une adresse d’Anthropic s’ouvre ; le code garde sa forme", () => {
  assert.equal(safeLoginUrl("https://claude.com/cai/oauth/authorize?x=1"), "https://claude.com/cai/oauth/authorize?x=1");
  assert.equal(safeLoginUrl("https://evil.example/"), null);
  assert.equal(safeLoginUrl("javascript:alert(1)"), null);
  assert.ok(CLAUDE_CODE_RE.test("Xy7Kq2Lm9Np4#state"));
  assert.ok(!CLAUDE_CODE_RE.test("a b"));
});
