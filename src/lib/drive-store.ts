import { apiFetch } from "@/lib/api";
import { cachedFetch, forget } from "@/lib/client-cache";
import type { DriveTree } from "@/lib/drive-paths";

// One reading of the drive tree per tab, shared by the deliverable watcher, the home's recent files
// and the search. Read again when something may have written there (a turn or a routine ended).
const key = (agentId: string) => `drive-tree:${agentId}`;
const listeners = new Map<string, Set<() => void>>();

/** The tree, at most `maxAgeMs` old (a read in flight is shared). */
export function driveTree(agentId: string, maxAgeMs = 60_000): Promise<DriveTree> {
  return cachedFetch(key(agentId), () => apiFetch<DriveTree>(`/api/agents/${agentId}/files/tree`), maxAgeMs);
}

/** Something may have written in the drive: the next reading goes to the instance, and watchers hear of it. */
export function driveChanged(agentId: string): void {
  forget(key(agentId));
  for (const fn of listeners.get(agentId) ?? []) fn();
}

export function onDriveChanged(agentId: string, fn: () => void): () => void {
  const set = listeners.get(agentId) ?? new Set();
  set.add(fn);
  listeners.set(agentId, set);
  return () => set.delete(fn);
}
