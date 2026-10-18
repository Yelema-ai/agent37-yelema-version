// The drive files an expert's reply points to, and those it wrote during the turn: what the chat
// shows as document cards under the reply. Pure: the chat's Markdown (download links) and its
// cards share these patterns.
import { isMemoryFolder } from "./drive-order.ts";

const DRIVE_PATH = String.raw`(?:/home/node|~)/Livrables/[^\s)\]\x60]+\.[A-Za-z0-9]{1,6}`;
// GPT models prefix the path with `sandbox:` (ChatGPT's own download links); it is dropped.
// [label](file:///home/node/Livrables/…), [label](sandbox:/home/node/Livrables/…) or [label](~/Livrables/…)
export const LINKED = new RegExp(String.raw`\]\((?:file://|sandbox:)?(${DRIVE_PATH})\)`, "g");
// [label](<file:///home/node/Livrables/…>): the angle-bracket form, where the path may hold spaces
export const ANGLED = new RegExp(String.raw`\]\(<(?:file://|sandbox:)?((?:/home/node|~)/Livrables/[^>\n]+\.[A-Za-z0-9]{1,6})>\)`, "g");
// `~/Livrables/Fatima/post.docx` or a bare path in the text
export const CODE = new RegExp("`(?:sandbox:)?((?:/home/node|~)/Livrables/[^`\\n]+\\.[A-Za-z0-9]{1,6})`", "g");
export const BARE = new RegExp(String.raw`(^|[\s(«"])(?:sandbox:)?(${DRIVE_PATH})`, "gm");

export function safeDecode(s: string): string {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
}

/** One spelling per file: `~/Livrables/…`, decoded. */
export function normDrivePath(path: string): string {
  return safeDecode(path).replace(/^\/home\/node\/Livrables(?=\/|$)/, "~/Livrables");
}

/** The drive files a text names, in the order it names them, each once. */
export function drivePathsIn(text: string): string[] {
  const found: { at: number; path: string }[] = [];
  for (const re of [ANGLED, LINKED, CODE]) for (const m of text.matchAll(re)) found.push({ at: m.index ?? 0, path: m[1] });
  for (const m of text.matchAll(BARE)) found.push({ at: (m.index ?? 0) + m[1].length, path: m[2] });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { path } of found.sort((a, b) => a.at - b.at)) {
    const p = normDrivePath(path);
    if (!seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  }
  return out;
}

export type DocKind = "pdf" | "excel" | "word" | "powerpoint" | "image" | "other";

export function docKind(name: string): DocKind {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (ext === "pdf") return "pdf";
  if (["xls", "xlsx", "xlsm", "csv", "ods"].includes(ext)) return "excel";
  if (["doc", "docx", "odt", "rtf"].includes(ext)) return "word";
  if (["ppt", "pptx", "odp", "key"].includes(ext)) return "powerpoint";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "avif"].includes(ext)) return "image";
  return "other";
}

export const toMs = (t: number): number => (t < 1e12 ? t * 1000 : t);

const SLACK_MS = 5_000;
// Without a start of its own, a turn is not looked back further than this.
const MAX_LOOKBACK_MS = 30 * 60_000;

/**
 * When the turn of the reply at `index` ran: from its question to its end (the reply's own time, or
 * `now` while it is written). The transcript may stamp a whole turn at its end; then the turn
 * starts after the previous reply, half an hour back at most.
 */
export function turnWindow(messages: readonly { role: string; at?: number }[], index: number, now: number): { start: number; end: number } {
  const end = messages[index]?.at ?? now;
  let j = index - 1;
  while (j >= 0 && messages[j].role !== "user") j--;
  let first = j;
  while (first > 0 && messages[first - 1].role === "user") first--;
  const asked = first >= 0 ? messages[first].at : undefined;
  let start: number;
  if (asked != null && asked < end - 1_000) start = asked;
  else {
    let k = first - 1;
    while (k >= 0 && messages[k].role !== "assistant") k--;
    const previous = k >= 0 ? messages[k].at : undefined;
    start = Math.max(previous ?? end - MAX_LOOKBACK_MS, end - MAX_LOOKBACK_MS);
  }
  return { start: start - SLACK_MS, end: end + SLACK_MS };
}

export interface DriveFile {
  name: string;
  path: string;
  type: string;
  size: number | null;
  modified: number;
  hidden?: boolean;
}

export interface TurnDoc {
  name: string;
  path: string;
  size: number | null;
  modified: number | null;
  kind: DocKind;
}

/**
 * The cards of one reply: the files its text names first, then the files of the drive written
 * during its turn, newest first; each file once. The memory folder and hidden files are not
 * deliverables.
 */
export function turnDocs(text: string, listing: readonly DriveFile[], window: { start: number; end: number }): TurnDoc[] {
  const byPath = new Map(listing.map((f) => [normDrivePath(f.path), f]));
  const out: TurnDoc[] = [];
  const seen = new Set<string>();
  const add = (path: string, f?: DriveFile) => {
    if (seen.has(path)) return;
    seen.add(path);
    const name = path.split("/").pop() ?? path;
    out.push({ name, path, size: f?.size ?? null, modified: f?.modified ?? null, kind: docKind(name) });
  };
  for (const p of drivePathsIn(text)) add(p, byPath.get(p));
  const written = listing
    .filter((f) => f.type === "file" && !f.hidden && f.modified >= window.start && f.modified <= window.end)
    .filter((f) => !normDrivePath(f.path).split("/").slice(2, -1).some(isMemoryFolder))
    .sort((a, b) => b.modified - a.modified);
  for (const f of written) add(normDrivePath(f.path), f);
  return out;
}
