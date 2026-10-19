import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVoiceKeyDraft, parseVoiceKeyRoute, voiceKeyPath, voiceKeyRefusal } from "./voice-keys.ts";

describe("voice keys", () => {
  it("names the back office's path of a scope, and of one provider's key in it", () => {
    assert.equal(voiceKeyPath({ kind: "client" }), "/app/voice/keys/client");
    assert.equal(voiceKeyPath({ kind: "own" }, "groq"), "/app/voice/keys/own/groq");
    assert.equal(voiceKeyPath({ kind: "member", id: "42" }, "openai"), "/app/voice/keys/members/42/openai");
    assert.equal(voiceKeyPath({ kind: "member", id: "../1" }), null);
    assert.equal(voiceKeyPath({ kind: "own" }, "../x"), null);
  });

  it("reads the app's route segments, and nothing else", () => {
    assert.deepEqual(parseVoiceKeyRoute(["own"]), { scope: { kind: "own" } });
    assert.deepEqual(parseVoiceKeyRoute(["client", "groq"]), { scope: { kind: "client" }, provider: "groq" });
    assert.deepEqual(parseVoiceKeyRoute(["members", "7", "gemini"]), { scope: { kind: "member", id: "7" }, provider: "gemini" });
    for (const bad of [[], ["x"], ["members"], ["members", "a"], ["own", "Groq!"], ["own", "groq", "x"]]) assert.equal(parseVoiceKeyRoute(bad), null, bad.join("/"));
  });

  it("a draft keeps its two fields, bounded", () => {
    assert.deepEqual(parseVoiceKeyDraft({ provider: "groq", secret: " gsk_x ", other: 1 }), { provider: "groq", secret: "gsk_x" });
    for (const bad of [null, {}, { provider: "groq" }, { provider: "groq", secret: " " }, { provider: "groq", secret: "x".repeat(301) }, { provider: "G R", secret: "x" }]) assert.equal(parseVoiceKeyDraft(bad), null);
    assert.match(voiceKeyRefusal("refused_key") ?? "", /refuse/);
    assert.equal(voiceKeyRefusal("inconnu"), null);
  });
});
