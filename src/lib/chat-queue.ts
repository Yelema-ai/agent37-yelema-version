// Messages sent while an expert answers go out together as ONE next turn, in order, their files
// merged (each keeps its own bubble and chips). No imports, for `node --test`.

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
