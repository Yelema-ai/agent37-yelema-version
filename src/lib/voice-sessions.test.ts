import assert from "node:assert/strict";
import { test } from "node:test";
import { isVoiceSession } from "./voice-sessions.ts";

test("les sessions ouvertes par un appel sont reconnues, une conversation écrite non", () => {
  for (const p of [
    "Demande faite pendant un appel vocal : ta réponse sera lue",
    "Un appel vocal commence maintenant avec toi",
    "Préparation de ton prochain appel vocal avec cette personne",
    "Transcription exacte de l'appel vocal du 25 octobre",
    "A request made during a voice call: your reply",
  ]) assert.ok(isVoiceSession(p), p);
  for (const p of ["Hello djeneba as tu accès a WhatsApp", "Prépare mon prochain appel vocal avec MTN", "", null]) assert.ok(!isVoiceSession(p), String(p));
});
