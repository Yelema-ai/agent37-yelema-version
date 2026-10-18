// Voice calls with an expert. The back office opens the call at Aethex and picks the agent; this app
// relays the signaling with the member's session (src/app/api/voice) and plays the audio in the browser.

export type VoiceLanguage = "fr" | "en";

export interface VoiceOption {
  key: string;
  label: string;
  language: VoiceLanguage;
  gender: "female" | "male" | "neutral";
  country: string;
  /** Public sample, playable without a key. */
  previewUrl: string;
  /** The voice a call in this language takes when none is chosen. */
  default: boolean;
}

export const VOICE_LANGUAGES: { id: VoiceLanguage; label: string }[] = [
  { id: "fr", label: "Français" },
  { id: "en", label: "Anglais" },
];

/** Signaling steps the SDK sends after `calls`, with the one method each takes. */
export const SIGNALING_METHOD = { offer: "POST", ice: "PATCH", status: "GET", end: "POST", feedback: "POST" } as const;
export type SignalingStep = keyof typeof SIGNALING_METHOD;

const CONVERSATION_ID = /^[A-Za-z0-9_-]{1,128}$/;
const KEY = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** The step a relayed request names, or null when the path or the method is not one the SDK sends. */
export function signalingStep(id: string, action: string, method: string): SignalingStep | null {
  if (!CONVERSATION_ID.test(id) || !Object.hasOwn(SIGNALING_METHOD, action)) return null;
  const step = action as SignalingStep;
  return SIGNALING_METHOD[step] === method ? step : null;
}

/** The `X-Yelema-*` headers of a call, kept only when well-formed; the back office checks them again. */
export function callHeaders(h: Headers): Record<string, string> | null {
  const expert = h.get("x-yelema-expert")?.trim().toLowerCase() ?? "";
  const language = h.get("x-yelema-language")?.trim().toLowerCase() ?? "";
  const voice = h.get("x-yelema-voice")?.trim().toLowerCase() ?? "";
  if (!KEY.test(expert) || !VOICE_LANGUAGES.some((l) => l.id === language)) return null;
  if (voice && !KEY.test(voice)) return null;
  return { "X-Yelema-Expert": expert, "X-Yelema-Language": language, ...(voice ? { "X-Yelema-Voice": voice } : {}) };
}

// ---- The member's choice, kept in this browser ---------------------------------------------------

export interface VoicePrefs {
  language: VoiceLanguage;
  /** Chosen voice per language; absent: the language's default. */
  voices: Partial<Record<VoiceLanguage, string>>;
}

// One setting per expert (its catalogue key); an expert not set yet takes what was chosen for all
// of them before, in "Mon profil" (the bare key), else French and its default voice.
const PREFS_KEY = "yelema-voice";

export function parseVoicePrefs(raw: string | null): VoicePrefs | null {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<VoicePrefs> | null;
    if (!v || typeof v !== "object") return null;
    return { language: v.language === "en" ? "en" : "fr", voices: v.voices && typeof v.voices === "object" ? v.voices : {} };
  } catch {
    return null;
  }
}

export function readVoicePrefs(expert: string): VoicePrefs {
  try {
    return parseVoicePrefs(localStorage.getItem(`${PREFS_KEY}:${expert}`)) ?? parseVoicePrefs(localStorage.getItem(PREFS_KEY)) ?? { language: "fr", voices: {} };
  } catch {
    return { language: "fr", voices: {} };
  }
}

export function writeVoicePrefs(expert: string, prefs: VoicePrefs): void {
  try {
    localStorage.setItem(`${PREFS_KEY}:${expert}`, JSON.stringify(prefs));
  } catch {}
}

// ---- Narrowing the list: gender × country ------------------------------------------------------------

export interface VoiceFilter {
  gender: "female" | "male" | null;
  country: string | null;
}

/** "neutral" voices are often mislabelled at Aethex: they only show under "all genders". */
const fits = (v: VoiceOption, f: VoiceFilter): boolean => (!f.gender || v.gender === f.gender) && (!f.country || v.country === f.country);

export const filterVoices = (voices: VoiceOption[], f: VoiceFilter): VoiceOption[] => voices.filter((v) => fits(v, f));

/** Genders and countries still on offer, each under the other choice, so both rows narrow each other. */
export function voiceFacets(voices: VoiceOption[], f: VoiceFilter): { genders: ("female" | "male")[]; countries: string[] } {
  const genders = new Set(filterVoices(voices, { ...f, gender: null }).map((v) => v.gender));
  const countries = new Set(filterVoices(voices, { ...f, country: null }).map((v) => v.country));
  return {
    genders: (["female", "male"] as const).filter((g) => genders.has(g)),
    countries: [...countries].sort((a, b) => countryName(a).localeCompare(countryName(b), "fr")),
  };
}

const REGIONS = new Intl.DisplayNames(["fr"], { type: "region" });
export const countryName = (code: string): string => REGIONS.of(code) ?? code;
export const countryFlag = (code: string): string => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

/** The voice a call takes: the one chosen for the language, else its default, else its first. */
export function chosenVoice(voices: VoiceOption[], prefs: VoicePrefs): VoiceOption | null {
  const ofLanguage = voices.filter((v) => v.language === prefs.language);
  return ofLanguage.find((v) => v.key === prefs.voices[prefs.language]) ?? ofLanguage.find((v) => v.default) ?? ofLanguage[0] ?? null;
}

// ---- Call history -----------------------------------------------------------------------------------

export interface CallRecord {
  /** The call's session id. */
  id: string;
  expert: string;
  language: VoiceLanguage;
  status: "open" | "ended" | "failed";
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  /** Written by the expert once the call is over, from the exact transcript it was handed. */
  subject: string | null;
  /** 3 to 5 short lines: asked, decided or done, still to do. Empty until written. */
  summary: string[];
  /** Just ended: the expert is probably still writing its subject and summary. */
  subjectPending: boolean;
  /**
   * The call's lines, for the « Transcription » tab, once the back office serves them (it does not
   * yet). Only a transcript the back office chose to serve: the raw one handed to the expert in its
   * session is full of recognition errors and is never dug out of the chat.
   */
  transcript?: TranscriptLine[] | null;
}

export interface TranscriptLine {
  who: "user" | "expert";
  text: string;
}

/** The well-formed lines of a call's transcript; empty when the back office sent none. */
export function transcriptOf(record: Pick<CallRecord, "transcript">): TranscriptLine[] {
  const lines = Array.isArray(record.transcript) ? record.transcript : [];
  return lines.filter((l): l is TranscriptLine => !!l && (l.who === "user" || l.who === "expert") && typeof l.text === "string" && l.text.trim() !== "");
}

// The back office hands the expert the call's exact transcript in the call's session. It is full of
// transcription errors: the chat shows that it was handed over, never the text. Prefix set by the back office.
const CALL_TRANSCRIPT = /^(Transcription exacte de l'appel vocal|Exact transcript of the voice call) /;
export const isCallTranscript = (content: string): boolean => CALL_TRANSCRIPT.test(content);

/** "3 min 16 s", "45 s". */
export function callDuration(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m} min${s ? ` ${s} s` : ""}` : `${s} s`;
}

/**
 * Where `query` appears in `text`, ignoring case and accents (« reunion » finds « Réunion »), as
 * [start, end) ranges of `text`; empty for an empty query. Searches the « Transcription » of a call.
 */
export function findInText(text: string, query: string): [number, number][] {
  const fold = (c: string) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const q = [...query.trim()].map(fold).join("");
  if (!q) return [];
  // Folded text, with where each folded character came from.
  let folded = "";
  const from: number[] = [];
  let i = 0;
  for (const ch of text) {
    const f = fold(ch);
    for (let k = 0; k < f.length; k++) from.push(i);
    folded += f;
    i += ch.length;
  }
  from.push(text.length);
  const out: [number, number][] = [];
  for (let at = folded.indexOf(q); at !== -1; at = folded.indexOf(q, at + q.length)) {
    const end = from[at + q.length - 1];
    out.push([from[at], end + [...text.slice(end)][0].length]);
  }
  return out;
}
