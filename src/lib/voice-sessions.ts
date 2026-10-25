// The sessions the back-office opens for a phone call (warm-up, prepared session, questions and tasks
// asked during the call, its transcript): known by their first message, which the back-office keeps
// fixed (contract test `VOICE_SESSION_OPENERS` in control-plane). They belong to the Appels tab, never
// to a chat rail.
const OPENERS = [
  "Demande faite pendant un appel vocal",
  "Un appel vocal commence",
  "Préparation de ton prochain appel vocal",
  "Transcription exacte de l'appel vocal",
  "A request made during a voice call",
  "A voice call is starting",
  "Preparing your next voice call",
  "Exact transcript of the voice call",
];

export function isVoiceSession(preview: string | null | undefined): boolean {
  const p = (preview ?? "").trimStart();
  return OPENERS.some((o) => p.startsWith(o));
}
