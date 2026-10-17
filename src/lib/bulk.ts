// Many requests at once, a few in flight, and the sentence that sums them up. No imports.

/** `worker` over `items`, at most `limit` running; each outcome in the items' order. */
export async function runPool<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;
  const runner = async () => {
    for (let i = next++; i < items.length; i = next++) {
      try {
        out[i] = { status: "fulfilled", value: await worker(items[i]) };
      } catch (reason) {
        out[i] = { status: "rejected", reason };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
  return out;
}

export type RoutineBulkAction = "activate" | "pause";

/** « 12 routines activées, 1 en échec ». */
export function routineBulkMessage(action: RoutineBulkAction, ok: number, failed: number): string {
  const many = ok > 1;
  const done =
    ok === 0
      ? `Aucune routine ${action === "activate" ? "activée" : "mise en pause"}`
      : `${ok} routine${many ? "s" : ""} ${action === "activate" ? `activée${many ? "s" : ""}` : `mise${many ? "s" : ""} en pause`}`;
  return failed ? `${done}, ${failed} en échec` : done;
}
