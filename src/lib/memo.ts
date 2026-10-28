// A process cache: one load in flight per key, answers kept `ttlMs`, failures never kept. Pure (no
// server-only), so the rules are tested; Next-specific keep-alive comes in through `background`.

export interface MemoOptions<T = unknown> {
  ttlMs: number;
  /** A shorter life for some answers (a miss), instead of `ttlMs`. */
  ttlOf?: (value: T) => number;
  /** Past `ttlMs` and under this age, the kept answer is served while a new one loads. */
  staleMs?: number;
  /** On a failed load, the last answer under this age is served instead of the error. */
  staleOnErrorMs?: number;
  /** A failure that drops the kept answer at once (a refused session). */
  evict?: (e: unknown) => boolean;
  /** Oldest entries go past this count. */
  maxEntries?: number;
  /** A load in flight longer than this is no longer shared: a stuck promise must not hold every caller. */
  maxFlightMs?: number;
  /** Handed every load nobody awaits (a revalidation), to keep the host alive until it settles. */
  background?: (settled: Promise<void>) => void;
  now?: () => number;
}

export interface Memo<T> {
  get(key: string, load: () => Promise<T>): Promise<T>;
  put(key: string, value: T): void;
  drop(key: string): void;
  clear(): void;
  /** The kept answer, whatever its age; undefined when none. */
  peek(key: string): T | undefined;
}

export function memo<T>(opts: MemoOptions<T>): Memo<T> {
  const now = opts.now ?? Date.now;
  const staleMs = Math.max(opts.staleMs ?? opts.ttlMs, opts.ttlMs);
  const keepMs = Math.max(staleMs, opts.staleOnErrorMs ?? 0);
  const maxEntries = opts.maxEntries ?? 1000;
  const maxFlightMs = opts.maxFlightMs ?? 60_000;
  const store = new Map<string, { at: number; value: T }>();
  const flying = new Map<string, { at: number; promise: Promise<T> }>();

  function keep(key: string, value: T): void {
    store.delete(key);
    store.set(key, { at: now(), value });
    while (store.size > maxEntries) {
      const oldest = store.keys().next().value as string;
      store.delete(oldest);
    }
  }

  function refresh(key: string, load: () => Promise<T>): Promise<T> {
    const running = flying.get(key);
    if (running && now() - running.at < maxFlightMs) return running.promise;
    const promise = Promise.resolve()
      .then(load)
      .then(
        (value) => {
          if (flying.get(key)?.promise === promise) flying.delete(key);
          keep(key, value);
          return value;
        },
        (e: unknown) => {
          if (flying.get(key)?.promise === promise) flying.delete(key);
          if (opts.evict?.(e)) {
            store.delete(key);
            throw e;
          }
          const last = store.get(key);
          if (last && opts.staleOnErrorMs && now() - last.at < opts.staleOnErrorMs) return last.value;
          throw e;
        }
      );
    flying.set(key, { at: now(), promise });
    return promise;
  }

  return {
    get(key, load) {
      const hit = store.get(key);
      const age = hit ? now() - hit.at : Infinity;
      if (hit && age < (opts.ttlOf?.(hit.value) ?? opts.ttlMs)) return Promise.resolve(hit.value);
      const fresh = refresh(key, load);
      if (!hit || age >= staleMs) return fresh;
      const settled = fresh.then(noop, noop);
      opts.background?.(settled);
      return Promise.resolve(hit.value);
    },
    put: keep,
    drop(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
      flying.clear();
    },
    peek(key) {
      const hit = store.get(key);
      return hit && now() - hit.at < keepMs ? hit.value : undefined;
    },
  };
}

function noop(): void {}
