// Un message, un seul tour : chaque envoi porte une clé que la passerelle reconnaît, et un renvoi après
// une coupure se rattache au tour déjà lancé. No imports, for `node --test`.

const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/;

export const newMessageKey = (): string => `m-${crypto.randomUUID()}`;

/** The key as the gateway accepts it, or undefined (an older app sends none). */
export const messageKeyOf = (raw: unknown): string | undefined => (typeof raw === "string" && KEY_RE.test(raw) ? raw : undefined);

/** The request never got an answer (connection cut, server unreachable): sending it again is safe. */
export const isNetworkError = (e: unknown): boolean => e instanceof TypeError;

// Server clock vs browser clock: how far before the browser's send time the stored message may sit.
const CLOCK_SKEW_MS = 60_000;

interface Bubble {
  role: string;
  content: string;
  at?: number;
}

/**
 * The transcript without what the engine already saved of the running turn: Hermes writes a turn as it
 * goes, so a transcript read mid-turn holds its user message, which the live bubbles show already.
 */
export function withoutRunningTurn<T extends Bubble>(history: T[], first: Bubble | undefined): T[] {
  if (!first?.at) return history;
  const head = first.content.trim().slice(0, 200);
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user" || m.at == null || m.at < first.at - CLOCK_SKEW_MS) continue;
    if (m.content.trim().startsWith(head)) return history.slice(0, i);
  }
  return history;
}
