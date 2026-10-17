// An expert's drive folder read as subjects and deliverables (`<Sujet>/<TYPE>_<SUJET>_<jour>_<date>/`).
// Shared by the tree route and the Livrables tab: type-only imports, for `node --test`.
import type { FileEntry } from "./types.ts";

export interface TreeNode extends FileEntry {
  children?: TreeNode[];
}

export type EntryRole = "memoire" | "inbox" | "archives" | "sources" | "readme" | "hidden" | "content";

/** What a folder or file is for, by its name alone. */
export function entryRole(entry: Pick<FileEntry, "name" | "type" | "hidden">): EntryRole {
  const dir = entry.type === "directory";
  const name = entry.name.toLowerCase();
  if (entry.hidden || name.startsWith(".")) return "hidden";
  if (dir && name === "_memoire") return "memoire";
  if (dir && name === "_inbox") return "inbox";
  if (dir && name === "archives") return "archives";
  if (dir && name === "sources") return "sources";
  if (!dir && name === "readme.md") return "readme";
  return "content";
}

/** Whether the tree scan lists a folder, from its names below the expert's folder (root = []). */
export function shouldDescend(segments: string[]): boolean {
  if (segments.some((s) => s.startsWith(".") || s.toLowerCase() === "_memoire")) return false;
  if (segments.length <= 2) return true;
  const last = segments[segments.length - 1].toLowerCase();
  return segments.length === 3 && (last === "sources" || last === "archives");
}

const DAYS = "lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche";
const NAME = new RegExp(`^([A-Za-z][A-Za-z0-9-]*)_(.+?)(?:_(?:${DAYS}))?_(\\d{4}-\\d{2}-\\d{2})$`, "i");

export interface ParsedName {
  type: string;
  subject: string;
  /** Midnight UTC of the named day. */
  date: number;
}

const stem = (name: string) => name.replace(/\.[A-Za-z0-9]{1,6}$/, "");
const words = (s: string) => s.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** `DASHBOARD_ITN15_vendredi_2026-10-16` (an extension is allowed); null when it does not follow the convention. */
export function parseDeliverableName(name: string): ParsedName | null {
  const m = NAME.exec(stem(name));
  if (!m) return null;
  const date = Date.parse(`${m[3]}T00:00:00Z`);
  if (Number.isNaN(date)) return null;
  return { type: m[1], subject: m[2], date };
}

const longDate = (ms: number) =>
  new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** « Dashboard · ITN15 · vendredi 16 octobre 2026 », or the name without extension nor underscores. */
export function humanTitle(name: string): string {
  const p = parseDeliverableName(name);
  if (!p) return capital(words(stem(name))) || name;
  return `${capital(words(p.type.toLowerCase()))} · ${words(p.subject)} · ${longDate(p.date)}`;
}

const FORMATS: [string, string[]][] = [
  ["PDF", ["pdf"]],
  ["Page web", ["html", "htm"]],
  ["Présentation", ["pptx", "ppt", "odp", "key"]],
  ["Document", ["docx", "doc", "odt", "rtf"]],
  ["Tableur", ["xlsx", "xls", "ods", "csv", "tsv"]],
  ["Image", ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]],
  ["Vidéo", ["mp4", "mov", "webm"]],
  ["Audio", ["mp3", "wav", "m4a", "ogg"]],
  ["Texte", ["md", "txt"]],
  ["Archive", ["zip", "gz", "tar"]],
];

/** The badge of a file, by extension; « Fichier » when unknown. */
export function formatLabel(name: string): string {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return FORMATS.find(([, exts]) => exts.includes(ext))?.[0] ?? "Fichier";
}

// The final file of a folder: a document before a picture or a note.
const RANK = ["PDF", "Page web", "Présentation", "Document", "Tableur", "Vidéo", "Audio", "Fichier", "Archive", "Image", "Texte"];
const rank = (e: FileEntry) => (e.type === "directory" ? RANK.length : RANK.indexOf(formatLabel(e.name)));

export interface Deliverable {
  path: string;
  isFolder: boolean;
  title: string;
  /** PDF, Tableur… from the main file, else the convention's TYPE. */
  kind: string;
  date: number;
  main: FileEntry | null;
  others: FileEntry[];
  sources: FileEntry[];
  archives: FileEntry[];
}

export interface Subject {
  path: string;
  title: string;
  readme: FileEntry | null;
  deliverables: Deliverable[];
  archives: FileEntry[];
  updated: number;
}

export interface DeliverablesBoard {
  subjects: Subject[];
  /** Files and dated folders straight in the expert's folder (older content). */
  loose: Deliverable[];
  archives: FileEntry[];
  inbox: { path: string; count: number } | null;
}

const visible = (n: TreeNode) => (n.children ?? []).filter((c) => entryRole(c) !== "hidden");
const ofRole = (n: TreeNode, role: EntryRole) => visible(n).filter((c) => entryRole(c) === role);
const inside = (n: TreeNode, role: EntryRole) => ofRole(n, role).flatMap((d) => visible(d));
const byDate = (a: { date: number }, b: { date: number }) => b.date - a.date;

export function toDeliverable(node: TreeNode): Deliverable {
  const parsed = parseDeliverableName(node.name);
  const date = parsed?.date ?? node.modified;
  if (node.type !== "directory") {
    return { path: node.path, isFolder: false, title: humanTitle(node.name), kind: formatLabel(node.name), date, main: node, others: [], sources: [], archives: [] };
  }
  const content = ofRole(node, "content").sort((a, b) => rank(a) - rank(b) || (b.size ?? 0) - (a.size ?? 0));
  const main = content[0] && content[0].type !== "directory" ? content[0] : null;
  const kind = main ? formatLabel(main.name) : parsed ? capital(words(parsed.type.toLowerCase())) : "Dossier";
  return {
    path: node.path,
    isFolder: true,
    title: humanTitle(node.name),
    kind,
    date,
    main,
    others: main ? content.slice(1) : content,
    sources: inside(node, "sources"),
    archives: inside(node, "archives"),
  };
}

function toSubject(node: TreeNode): Subject {
  const deliverables = ofRole(node, "content").map(toDeliverable).sort(byDate);
  return {
    path: node.path,
    title: capital(words(node.name)),
    readme: ofRole(node, "readme")[0] ?? null,
    deliverables,
    archives: inside(node, "archives"),
    updated: deliverables[0]?.date ?? node.modified,
  };
}

/** The expert's folder as the tab shows it: journal hidden, unclassified apart, gathered material inside its deliverable. */
export function buildBoard(root: TreeNode): DeliverablesBoard {
  const content = ofRole(root, "content");
  const isSubject = (n: TreeNode) => n.type === "directory" && !parseDeliverableName(n.name);
  const inbox = ofRole(root, "inbox")[0];
  const inboxCount = inbox ? visible(inbox).length : 0;
  return {
    subjects: content.filter(isSubject).map(toSubject).sort((a, b) => b.updated - a.updated),
    loose: content.filter((n) => !isSubject(n)).map(toDeliverable).sort(byDate),
    archives: inside(root, "archives"),
    inbox: inbox && inboxCount > 0 ? { path: inbox.path, count: inboxCount } : null,
  };
}

/** At most this many folders listed per scan; deeper or later ones stay unlisted (shown empty). */
export const SCAN_MAX_LISTINGS = 150;

/** The expert's folder and what `shouldDescend` lets through, `concurrency` listings at a time. */
export async function scanTree(
  root: FileEntry,
  list: (path: string) => Promise<FileEntry[]>,
  concurrency = 6
): Promise<{ tree: TreeNode; complete: boolean }> {
  const tree: TreeNode = { ...root };
  let level: { node: TreeNode; segments: string[] }[] = [{ node: tree, segments: [] }];
  let listed = 0;
  let complete = true;
  // Level by level, so each level's listings run side by side.
  while (level.length) {
    if (listed + level.length > SCAN_MAX_LISTINGS) {
      complete = false;
      level = level.slice(0, Math.max(0, SCAN_MAX_LISTINGS - listed));
    }
    listed += level.length;
    const next: typeof level = [];
    let i = 0;
    const worker = async () => {
      for (let job = level[i++]; job; job = level[i++]) {
        const children: TreeNode[] = (await list(job.node.path).catch(() => [])).map((e) => ({ ...e }));
        job.node.children = children;
        for (const c of children) {
          const segments = [...job.segments, c.name];
          if (c.type === "directory" && shouldDescend(segments)) next.push({ node: c, segments });
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));
    level = next;
  }
  return { tree, complete };
}
