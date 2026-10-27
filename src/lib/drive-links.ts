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

// A drive FOLDER the Expert cites (« Dossier local : `Livrables/Fatima/tajplast/flyers-modernes/` »),
// with or without `~/` or `/home/node/`: in backticks when its last part has no extension, bare in
// the text only with its closing slash (a bare name without one could be a file).
const FOLDER = String.raw`(?:(?:/home/node|~)/)?Livrables(?:/[^\s/)\]\x60«»"]+)+`;
// In backticks a folder name may hold spaces (« Pièces jointes »).
export const FOLDER_CODE = new RegExp("`(?:sandbox:)?((?:(?:/home/node|~)/)?Livrables(?:/[^/`\\n]+)+)/?`", "g");
export const FOLDER_BARE = new RegExp(String.raw`(^|[\s(«"])(${FOLDER})/(?=[\s).,;:!?»"]|$)`, "gm");

/** `~/Livrables/…` for a cited folder, or null when it names a file (its last part has an extension). */
export function citedFolder(path: string): string | null {
  const clean = safeDecode(path).replace(/\/+$/, "");
  if (/\.[A-Za-z0-9]{1,6}$/.test(clean.split("/").pop() ?? "")) return null;
  if (clean.split("/").some(isMemoryFolder)) return null;
  return clean.replace(/^(?:\/home\/node\/|~\/)?Livrables/, "~/Livrables");
}

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

const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/"));

/**
 * The cards of one reply: the files its text names first, then the deliverables its own turn wrote
 * (`written`: as the runtime's history reports them, and the reply's MEDIA tags), each once. Never a file written by another
 * conversation at the same time. Memory, notes and technical files get no card. A named file missing
 * from a folder the listing covers does not exist (a path the expert made up): no card for it.
 */
/** Working files (data, code, logs, subtitle tracks) are the Expert's own kitchen, never a deliverable shown under a reply. */
const TECHNICAL = /\.(srt|vtt|json|jsonl|py|js|mjs|ts|sh|yaml|yml|toml|log|lock|env|ini|cfg|pyc|sqlite|db)$/i;
export const isTechnicalFile = (name: string) => TECHNICAL.test(name);

/** Never a card nor a link in the chat: working files, notes (.md, .txt: Leslie, 27/10) and anything in the memory folder. */
export const isHiddenInChat = (path: string) =>
  isTechnicalFile(path) || /\.(md|markdown|txt)$/i.test(path) || path.split("/").slice(0, -1).some(isMemoryFolder);

export function turnDocs(text: string, listing: readonly DriveFile[], written: readonly string[] = []): TurnDoc[] {
  const byPath = new Map(listing.map((f) => [normDrivePath(f.path), f]));
  const listed = new Set([...byPath.keys()].map(parentOf));
  const out: TurnDoc[] = [];
  const seen = new Set<string>();
  const add = (path: string, f?: DriveFile) => {
    if (seen.has(path) || isHiddenInChat(path)) return;
    seen.add(path);
    const name = path.split("/").pop() ?? path;
    out.push({ name, path, size: f?.size ?? null, modified: f?.modified ?? null, kind: docKind(name) });
  };
  for (const p of drivePathsIn(text)) if (byPath.has(p) || !listed.has(parentOf(p))) add(p, byPath.get(p));
  for (const w of written) {
    const p = normDrivePath(w.startsWith("Livrables/") ? `~/${w}` : w);
    add(p, byPath.get(p));
  }
  return out;
}
