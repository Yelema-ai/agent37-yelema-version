// The order of a drive folder (Livrables): the memory folder pinned first, then everything else,
// folders and files together, from the newest change to the oldest; an entry without a date comes
// last, by name.

/** « memoire », « Mémoire », « MEMORY »: the folder an expert keeps its memory in. */
export function isMemoryFolder(name: string): boolean {
  const plain = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^[._]+/, "");
  return plain === "memoire" || plain === "memory";
}

export function sortDriveEntries<E extends { name: string; type: string; modified: number | null | undefined }>(entries: readonly E[]): E[] {
  const pinned = (e: E) => e.type === "directory" && isMemoryFolder(e.name);
  const dated = (e: E) => typeof e.modified === "number" && e.modified > 0;
  return [...entries].sort((a, b) => {
    if (pinned(a) !== pinned(b)) return pinned(a) ? -1 : 1;
    if (dated(a) !== dated(b)) return dated(a) ? -1 : 1;
    if (dated(a) && dated(b) && a.modified !== b.modified) return (b.modified as number) - (a.modified as number);
    return a.name.localeCompare(b.name, "fr", { sensitivity: "base", numeric: true });
  });
}
