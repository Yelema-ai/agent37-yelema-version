// The conversation rail kept in step with the instance: the server list is the truth; a row the
// app just created (not listed upstream yet) survives a short while so it doesn't blink away.

const LOCAL_GRACE_MS = 2 * 60_000;

type Row = { session_id: string; last_active: number };

export function mergeRail<T extends Row>(server: readonly T[], local: readonly T[], now = Date.now()): T[] {
  const known = new Set(server.map((s) => s.session_id));
  const fresh = local.filter((s) => !known.has(s.session_id) && now - s.last_active < LOCAL_GRACE_MS);
  return [...fresh, ...server];
}

/** True when the instance reports newer activity on `id` than the previous listing did. */
export function movedUpstream(prev: readonly Row[] | null, next: readonly Row[], id: string | null): boolean {
  if (!prev || !id) return false;
  const before = prev.find((s) => s.session_id === id)?.last_active ?? 0;
  const after = next.find((s) => s.session_id === id)?.last_active ?? 0;
  return before > 0 && after > before;
}
