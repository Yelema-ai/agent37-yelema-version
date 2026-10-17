import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { anyExpertOverride, choiceLabel, fallbackModelGroups, filterModelGroups, isProviderParam, profilesWith, withAllExperts, type ModelGroup } from "./model-options.ts";
import type { LlmGroup } from "./llm-accounts.ts";

const list: ModelGroup[] = [
  { provider: "anthropic", label: "Anthropic", source: "account", models: [{ id: "claude-opus-5-5", label: "Claude Opus 5.5" }, { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" }] },
  { provider: "custom:Yelema", label: "Moteur Yelema", source: "yelema", models: [{ id: "gpt-5.5", label: "GPT-5.5" }] },
];
const group = (provider: string, model: string, fallbacks: string[] = []): LlmGroup => ({ provider, model, fallbacks, accounts: [] });

describe("liste de modèles d’un sélecteur", () => {
  it("filtre par libellé, identifiant ou fournisseur, sans groupe vide", () => {
    assert.deepEqual(filterModelGroups(list, "opus").map((g) => g.models.map((m) => m.id)), [["claude-opus-5-5"]]);
    assert.deepEqual(filterModelGroups(list, "SONNET-5").map((g) => g.provider), ["anthropic"]);
    assert.equal(filterModelGroups(list, "yelema")[0]!.models.length, 1);
    assert.equal(filterModelGroups(list, "  ").length, 2);
    assert.equal(filterModelGroups(list, "mistral").length, 0);
  });

  it("libellé lisible d’un choix, identifiant brut s’il est inconnu", () => {
    assert.equal(choiceLabel(list, { provider: "anthropic", model: "claude-opus-5-5" }), "Claude Opus 5.5 (Anthropic)");
    assert.equal(choiceLabel(list, { provider: "gemini", model: "gemini-3-pro" }), "gemini-3-pro");
  });

  it("repli : les modèles nommés par les comptes, puis ceux de Yelema", () => {
    const out = fallbackModelGroups([group("anthropic", "claude-opus-5-5", ["claude-sonnet-5-5"])], () => "Anthropic", { provider: "custom:Yelema", models: [{ id: "gpt-5.5", label: "GPT-5.5" }] });
    assert.deepEqual(out.map((g) => [g.provider, g.source, g.models.map((m) => m.id)]), [["anthropic", "account", ["claude-opus-5-5", "claude-sonnet-5-5"]], ["custom:Yelema", "yelema", ["gpt-5.5"]]]);
    assert.equal(fallbackModelGroups([], () => "", null).length, 0);
  });

  it("paramètre fournisseur : un id Hermes, rien d’autre", () => {
    assert.ok(isProviderParam("anthropic") && isProviderParam("custom:Yelema"));
    for (const bad of [null, "", "Anthropic API", "../x", "a;b"]) assert.equal(isProviderParam(bad), false, String(bad));
  });
});

describe("modèle des experts", () => {
  it("la carte envoyée garde tous les experts, la remise à zéro en null", () => {
    const current = { fatima: { provider: "anthropic", model: "claude-sonnet-5-5" } };
    assert.deepEqual(profilesWith(current, "djeneba", { provider: "custom:Yelema", model: "gpt-5.5" }), { ...current, djeneba: { provider: "custom:Yelema", model: "gpt-5.5" } });
    assert.deepEqual(profilesWith(current, "fatima", null), { fatima: null });
    assert.deepEqual(profilesWith(undefined, "x", null), { x: null });
  });

  it("un écart n’est compté que pour un expert connu", () => {
    assert.equal(anyExpertOverride({ fatima: null }, ["fatima"]), false);
    assert.equal(anyExpertOverride({ ghost: { provider: "a", model: "m" } }, ["fatima"]), false);
    assert.equal(anyExpertOverride({ fatima: { provider: "a", model: "m" } }, ["fatima"]), true);
  });

  it("tous les experts : modèle du principal, ou le fournisseur choisi passe principal", () => {
    const groups = [group("anthropic", "claude-opus-5-5", ["claude-sonnet-5-5"]), group("openrouter", "x/y")];
    assert.deepEqual(withAllExperts(groups, { provider: "anthropic", model: "claude-sonnet-5-5" })!.map((g) => [g.provider, g.model, g.fallbacks]), [["anthropic", "claude-sonnet-5-5", []], ["openrouter", "x/y", []]]);
    assert.deepEqual(withAllExperts(groups, { provider: "openrouter", model: "openai/gpt-5.5" })!.map((g) => [g.provider, g.model]), [["openrouter", "openai/gpt-5.5"], ["anthropic", "claude-opus-5-5"]]);
    assert.equal(withAllExperts(groups, { provider: "gemini", model: "g" }), null);
  });
});
