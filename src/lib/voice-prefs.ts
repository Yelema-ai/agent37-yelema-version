"use client";

import { apiFetch } from "@/lib/api";
import { legacyVoices, readVoicePrefs, voicePatch, voicesFor, writeVoicePrefs, type ServerVoices, type VoicePrefs } from "@/lib/voice";

// The member's call settings: the voice from the back office (shared with the mobile app), the
// language from this browser. Read once per page; a save refreshes it.
let server: Promise<ServerVoices> | null = null;
const load = (): Promise<ServerVoices> =>
  (server ??= apiFetch<{ voices?: ServerVoices }>("/api/account").then(
    (r) => r.voices ?? {},
    () => ({})
  ));

export async function loadVoicePrefs(expert: string): Promise<VoicePrefs> {
  const local = readVoicePrefs(expert);
  let voices = await load();
  const legacy = legacyVoices(expert);
  // A voice chosen here before the back office kept it: pushed once, unless one is already kept.
  if (legacy && !voices[expert]) {
    voices = await saveVoices(expert, legacy).catch(() => voices);
    writeVoicePrefs(expert, local);
  }
  return { language: local.language, voices: voicesFor(voices, expert) };
}

async function saveVoices(expert: string, voices: VoicePrefs["voices"]): Promise<ServerVoices> {
  const r = await apiFetch<{ voices?: ServerVoices }>("/api/account", { method: "PATCH", body: JSON.stringify({ voices: voicePatch(expert, voices) }) });
  const next = r.voices ?? {};
  server = Promise.resolve(next);
  return next;
}

export async function saveVoicePrefs(expert: string, prefs: VoicePrefs): Promise<void> {
  writeVoicePrefs(expert, prefs);
  await saveVoices(expert, prefs.voices);
}
