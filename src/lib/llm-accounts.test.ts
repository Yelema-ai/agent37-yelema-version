import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { llmPending, llmRefusalMessage, type LlmOverview } from "./llm.ts";
import { cleanModel, layoutOf, moveItem, parseAccountDraft, parseAccountPatch, parseLayout, parseScopeParam, scopeParam, type LlmGroup } from "./llm-accounts.ts";

const group = (provider: string, ids: string[], model = "m-1"): LlmGroup => ({ provider, model, fallbacks: [], accounts: ids.map((id) => ({ id, provider: "anthropic-api", label: "", hint: "…abcd", verified: true, state: "active" })) });

describe("ordre après un glisser-déposer", () => {
  it("déplace un élément vers le haut ou le bas ; un indice hors liste ne change rien", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(moveItem(["a", "b"], 0, 5), ["a", "b"]);
    assert.deepEqual(moveItem(["a", "b"], -1, 0), ["a", "b"]);
  });

  it("l’ordre envoyé reprend les groupes tels qu’affichés, comptes par id", () => {
    const groups = [group("gemini", ["3"], "gemini-3-pro"), { ...group("anthropic", ["2", "1"], "claude-opus-5-5"), fallbacks: ["claude-sonnet-5-5"] }];
    assert.deepEqual(layoutOf(groups), { groups: [
      { provider: "gemini", model: "gemini-3-pro", fallbacks: [], accounts: ["3"] },
      { provider: "anthropic", model: "claude-opus-5-5", fallbacks: ["claude-sonnet-5-5"], accounts: ["2", "1"] },
    ] });
    assert.deepEqual(parseLayout(layoutOf(groups)), layoutOf(groups));
  });
});

describe("contrôles d’entrée de l’app (le back-office tient les vraies règles)", () => {
  it("portée : own, client ou id de membre ; rien d’autre", () => {
    assert.deepEqual(parseScopeParam(null), { kind: "own" });
    assert.deepEqual(parseScopeParam("client"), { kind: "client" });
    assert.deepEqual(parseScopeParam("12"), { kind: "member", id: "12" });
    for (const bad of ["x", "12 ", "../1", "1;2"]) assert.equal(parseScopeParam(bad), null);
    assert.equal(scopeParam({ kind: "member", id: "1/../2" }), null);
  });

  it("compte : un fournisseur à la forme d’un id, des champs bornés, rien d’autre ne passe", () => {
    assert.deepEqual(parseAccountDraft({ provider: "anthropic-api", secret: " sk-ant-x ", label: " Compta ", extra: "x" }), { provider: "anthropic-api", secret: "sk-ant-x", label: "Compta" });
    assert.deepEqual(parseAccountDraft({ provider: "openai-codex", model: "" }), { provider: "openai-codex" });
    for (const bad of [null, {}, { provider: "Anthropic API" }, { provider: "x", secret: 1 }, { provider: "x", model: "x'; id" }, { provider: "x", secret: "s".repeat(5000) }]) assert.equal(parseAccountDraft(bad), null, JSON.stringify(bad));
    assert.deepEqual(parseAccountPatch({ label: " Perso " }), { label: "Perso" });
    for (const bad of [{}, { secret: "" }, { label: "x".repeat(61) }]) assert.equal(parseAccountPatch(bad), null);
  });

  it("ordre : groupes bornés, ids numériques, modèles à la forme attendue", () => {
    const ok = { groups: [{ provider: "custom:Acme", model: "acme-1", fallbacks: [], accounts: ["5"] }] };
    assert.ok(parseLayout(ok));
    for (const bad of [{ groups: [] }, { groups: [{ ...ok.groups[0], accounts: ["x"] }] }, { groups: [{ ...ok.groups[0], model: "a b" }] }, { groups: [{ ...ok.groups[0], provider: "custom:" }] }, { groups: [{ ...ok.groups[0], fallbacks: Array(6).fill("m-1") }] }]) assert.equal(parseLayout(bad), null, JSON.stringify(bad));
    assert.equal(cleanModel(" claude-opus-5-5 "), "claude-opus-5-5");
    assert.equal(cleanModel("x"), null);
  });

  it("nouveaux refus : une phrase en français ; une pose de comptes en cours relance la lecture", () => {
    for (const code of ["too_many_accounts", "login_needs_instance", "bad_layout"]) assert.match(llmRefusalMessage(code) ?? "", /\.$/);
    const base = { catalogue: [], mine: null, own: null, membersMayBringKey: false } as unknown as LlmOverview;
    assert.equal(llmPending({ ...base, setup: { groups: [], state: "pending" } }), true);
    assert.equal(llmPending({ ...base, setup: { groups: [], state: "applied" } }), false);
  });
});
