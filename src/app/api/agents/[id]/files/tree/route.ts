import { agent37, Agent37Error } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { runPool } from "@/lib/bulk";
import { DRIVE_ROOT } from "@/lib/drive";
import type { DriveTree } from "@/lib/drive-paths";
import { isMemoryFolder } from "@/lib/drive-order";
import { handleError, json } from "@/lib/http";
import { memo } from "@/lib/memo";
import type { FileEntry } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

// The drive three levels deep (Livrables/<Expert>/<dossier>/fichier) in ONE call, for every screen
// that watches or lists deliverables: listed here in parallel, a bounded number of folders, the
// experts' memory folders not entered. `complete` is false when a folder could not be listed.
const DEPTH = 3;
const MAX_FOLDERS = 40;
const PARALLEL = 6;


// Several tabs and screens of one member ask together: one walk per instance every few seconds.
const trees = memo<DriveTree>({ ttlMs: 10_000, maxEntries: 2000, maxFlightMs: 90_000 });

async function listRoot(id: string): Promise<FileEntry[]> {
  try {
    return (await agent37.listFiles(id, DRIVE_ROOT)).entries ?? [];
  } catch (e) {
    // An instance the back office has not prepared yet has no drive: create it on first look.
    if (!(e instanceof Agent37Error && e.status === 404)) throw e;
    await agent37.makeDir(id, DRIVE_ROOT);
    return (await agent37.listFiles(id, DRIVE_ROOT)).entries ?? [];
  }
}

async function walk(id: string): Promise<DriveTree> {
  const root = await listRoot(id);
  const entries: DriveTree["entries"] = root.map((e) => ({ ...e, depth: 0 }));
  let complete = true;
  let level = root;
  let listed = 1;
  for (let depth = 1; depth < DEPTH; depth++) {
    const folders = level.filter((e) => e.type === "directory" && !isMemoryFolder(e.name)).slice(0, MAX_FOLDERS - listed);
    if (!folders.length) break;
    listed += folders.length;
    const found = await runPool(folders, PARALLEL, (d) => agent37.listFiles(id, d.path));
    level = [];
    for (const r of found) {
      if (r.status === "rejected") {
        complete = false;
        continue;
      }
      for (const e of r.value.entries ?? []) {
        entries.push({ ...e, depth });
        level.push(e);
      }
    }
  }
  return { entries, complete };
}

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    await requireAgentAccess(id);
    return json(await trees.get(id, () => walk(id)), 200);
  } catch (e) {
    return handleError(e);
  }
}
