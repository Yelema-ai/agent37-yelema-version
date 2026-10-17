// Messages sent while an expert answers are steered into its turn; those it cannot take go out together
// as ONE next turn, in order, their files merged (each keeps its own bubble and chips). No imports, for
// `node --test`.

export const FOLLOW_UP_HEADER = "Compléments envoyés pendant ta réponse :";

export interface QueuedInput {
  text: string;
  files: string[];
}

export function batchQueued(items: QueuedInput[]): QueuedInput {
  const texts = items.map((i) => i.text.trim()).filter(Boolean);
  const text = items.length > 1 && texts.length > 0 ? [FOLLOW_UP_HEADER, ...texts].join("\n\n") : (texts[0] ?? "");
  return { text, files: [...new Set(items.flatMap((i) => i.files))] };
}

// A steer Hermes did not read comes back as `pending_steer`: the unread messages joined by "\n", always
// the latest ones. Returns how many trailing messages it covers, 0 when it matches none of them.
export function unreadSteerCount(texts: string[], pending: string): number {
  const want = pending.trim();
  for (let n = 1; n <= texts.length; n++) {
    if (texts.slice(-n).map((t) => t.trim()).join("\n") === want) return n;
  }
  return 0;
}

const STEER_OPEN = "[OUT-OF-BAND USER MESSAGE";
const STEER_CLOSE = "[/OUT-OF-BAND USER MESSAGE]";

// A steer read mid-turn is stored by Hermes inside its marker: show only what the user wrote.
export function steerText(content: string): string {
  const c = content.trim();
  if (!c.startsWith(STEER_OPEN) || !c.endsWith(STEER_CLOSE)) return content;
  const start = c.indexOf("\n");
  return start < 0 ? content : c.slice(start + 1, -STEER_CLOSE.length).trim();
}

/** `item` placed just before the bubble `beforeId` (a reply in progress), else at the end. */
export function insertBefore<T extends { id: string }>(list: readonly T[], beforeId: string, item: T): T[] {
  const i = list.findIndex((m) => m.id === beforeId);
  return i < 0 ? [...list, item] : [...list.slice(0, i), item, ...list.slice(i)];
}
