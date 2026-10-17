// An expert's process starts on its first call (Agent37 keeps a few resident) and the edge cuts at
// ~9 s with a 502 while it boots: a read is simply asked again, the process is up by then.
const COLD_START_WAITS_MS = [2_000, 4_000];

/** How long to wait before re-asking this read, or null to give up. */
export function coldStartWait(method: string | undefined, status: number, attempt: number): number | null {
  if ((method ?? "GET").toUpperCase() !== "GET" || ![502, 503, 504].includes(status)) return null;
  return COLD_START_WAITS_MS[attempt] ?? null;
}
