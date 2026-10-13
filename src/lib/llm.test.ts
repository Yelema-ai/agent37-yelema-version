import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isMemberId, modelChoiceRefusal, parseModelChoice, llmPending, llmRefusalMessage, parseKeyDraft, parseLoginDraft, safeVerificationUrl, scopePath, type LlmOverview } from "./llm.ts";

describe("llmRefusalMessage", () => {
  it("each refusal code of the contract has its own French sentence", () => {
    const codes = ["unknown_provider", "bad_secret_format", "secret_refused", "unknown_model", "forbidden", "not_found", "too_many_attempts", "unavailable", "bad_request", "bad_name", "reserved_name", "bad_url", "no_instance", "login_unavailable"];
    const sentences = codes.map((c) => llmRefusalMessage(c));
    for (const s of sentences) assert.ok(typeof s === "string" && /[.!]$/.test(s) && !/[a-z]_[a-z]/.test(s));
    assert.equal(new Set(sentences).size, codes.length);
  });

  it("a code that is not one of these gets no sentence here", () => {
    assert.equal(llmRefusalMessage("internal_error"), null);
    assert.equal(llmRefusalMessage("unauthorized"), null);
    assert.equal(llmRefusalMessage(""), null);
  });

  it("an unknown model lists the provider's suggestions, and only plain model names", () => {
    assert.equal(llmRefusalMessage("unknown_model", ["claude-sonnet-5", "claude-opus-5"]), "Ce modèle n’existe pas sur ce compte. Modèles proposés : claude-sonnet-5, claude-opus-5.");
    assert.equal(llmRefusalMessage("unknown_model", ["<script>", 42, "a b", ""]), "Ce modèle n’existe pas sur ce compte.");
    assert.equal(llmRefusalMessage("secret_refused", ["claude-sonnet-5"]), llmRefusalMessage("secret_refused"));
    assert.equal(llmRefusalMessage("unknown_model", Array.from({ length: 20 }, (_, i) => `m-${i}`))?.split(",").length, 6);
  });
});

describe("scopePath", () => {
  it("names the back office's route for each scope", () => {
    assert.equal(scopePath("/app/llm", { kind: "client" }), "/app/llm/client");
    assert.equal(scopePath("/app/llm", { kind: "own" }), "/app/llm/own");
    assert.equal(scopePath("/app/mcp", { kind: "member", id: "42" }), "/app/mcp/members/42");
  });

  it("a member id that is not a plain number never reaches a URL", () => {
    for (const id of ["../client", "4/..", "4?x=1", "", "abc", " 4", "4 ", "1234567890123"]) {
      assert.equal(isMemberId(id), false, id);
      assert.equal(scopePath("/app/llm", { kind: "member", id }), null, id);
    }
  });
});

describe("parseKeyDraft", () => {
  it("keeps the three fields and nothing else", () => {
    assert.deepEqual(parseKeyDraft({ provider: "anthropic-api", secret: " sk-ant-x ", model: " claude-sonnet-5 ", role: "admin", workspace: "w" }), { provider: "anthropic-api", secret: "sk-ant-x", model: "claude-sonnet-5" });
  });

  it("no key, or an empty one: the key in place is kept", () => {
    assert.deepEqual(parseKeyDraft({ provider: "openai", model: "gpt-5" }), { provider: "openai", model: "gpt-5" });
    assert.deepEqual(parseKeyDraft({ provider: "openai", secret: "   ", model: "gpt-5" }), { provider: "openai", model: "gpt-5" });
  });

  it("a private endpoint carries its name and address; another provider never does", () => {
    assert.deepEqual(parseKeyDraft({ provider: "custom", name: " vllm-prod ", baseUrl: " https://llm.acme.ci/v1 ", model: "meta/llama-4" }), { provider: "custom", model: "meta/llama-4", name: "vllm-prod", baseUrl: "https://llm.acme.ci/v1" });
    assert.deepEqual(parseKeyDraft({ provider: "openai", name: "x", baseUrl: "https://evil.example", model: "gpt-5" }), { provider: "openai", model: "gpt-5" });
  });

  it("refuses what is not a draft", () => {
    for (const body of [null, "x", [], {}, { provider: "openai" }, { provider: "Open AI", model: "m" }, { provider: "openai", model: "" }, { provider: "openai", model: "m", secret: 12 }, { provider: "openai", model: "m", secret: "k".repeat(4201) }, { provider: "custom", model: "m" }, { provider: "custom", model: "m", name: "vllm" }, { provider: "custom", model: "m", name: "vllm", baseUrl: 3 }, { provider: "openai", model: "m".repeat(122) }]) {
      assert.equal(parseKeyDraft(body), null, JSON.stringify(body));
    }
  });
});

describe("llmPending", () => {
  const base: LlmOverview = { catalogue: [], mine: null, own: null, membersMayBringKey: false };
  it("is true while any key the caller sees is still being installed", () => {
    assert.equal(llmPending(base), false);
    assert.equal(llmPending({ ...base, mine: { source: "client", provider: "openai", model: "gpt-5", state: "pending", since: null } }), true);
    assert.equal(llmPending({ ...base, members: [{ id: "1", name: null, email: "a@b.c", source: "client", state: "pending", own: null }] }), true);
    assert.equal(llmPending({ ...base, client: { provider: "openai", model: "gpt-5", hint: "…abcd", verified: true, state: "failed", updatedAt: null } }), false);
  });
});

describe("subscription sign-in", () => {
  it("a request carries a provider and a model, nothing else", () => {
    assert.deepEqual(parseLoginDraft({ provider: "openai-codex", model: " gpt-5-codex ", secret: "x", scope: "client" }), { provider: "openai-codex", model: "gpt-5-codex" });
    for (const body of [null, {}, { provider: "openai-codex" }, { provider: "x y", model: "m" }, { provider: "openai-codex", model: "" }]) assert.equal(parseLoginDraft(body), null);
  });

  it("only an https page is opened for the member", () => {
    assert.equal(safeVerificationUrl("https://auth.openai.com/codex/device"), "https://auth.openai.com/codex/device");
    for (const url of ["http://auth.openai.com/x", "javascript:alert(1)", "data:text/html,x", "", undefined, 3, "pas une adresse"]) assert.equal(safeVerificationUrl(url), null);
  });
});

describe("parseModelChoice", () => {
  it("keeps a model (or null) and an optional profile, and nothing else", () => {
    assert.deepEqual(parseModelChoice({ model: "anthropic/claude-sonnet-5", extra: 1 }), { model: "anthropic/claude-sonnet-5" });
    assert.deepEqual(parseModelChoice({ model: null, profile: "acme__adjoua", role: "admin" }), { model: null, profile: "acme__adjoua" });
  });

  it("refuses a trapped model or profile before anything travels", () => {
    for (const model of ["a'b", 'a"b', "$(id)", "a\nb", "a;b", "", 7, undefined]) assert.equal(parseModelChoice({ model }), null);
    for (const profile of ["../default", "A b", "x'y", "$(id)", 3, null]) assert.equal(parseModelChoice({ model: "yelema-default", profile }), null);
    assert.equal(parseModelChoice("yelema-default"), null);
  });

  it("a refused pick reads as a French sentence that names no model", () => {
    for (const code of ["unknown_model", "unknown_profile", "unavailable", "too_many_attempts"]) assert.match(modelChoiceRefusal(code) ?? "", /[.!]$/);
    assert.equal(modelChoiceRefusal("internal_error"), null);
  });
});
