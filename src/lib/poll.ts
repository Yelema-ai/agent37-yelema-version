// A poll that stops while the tab is hidden and runs once when it shows again (if a tick was due),
// one run at a time, optionally spacing out and giving up after a deadline. Pure: the timers and the
// page's visibility come in through `env`, so the rules are tested.

export interface PollEnv {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  hidden(): boolean;
  /** Calls back when the page shows or hides; returns the unsubscribe. */
  onVisibility(fn: () => void): () => void;
  now(): number;
}

export interface PollOptions {
  everyMs: number;
  /** Each run multiplies the delay by this, up to `maxMs` (no backoff by default). */
  factor?: number;
  maxMs?: number;
  /** Stop for good this long after the start. */
  deadlineMs?: number;
  /** Run at once on start (default true). */
  immediate?: boolean;
}

export interface Poller {
  stop(): void;
  /** Back to the first delay (something happened: poll closely again). */
  reset(): void;
  /** Run now, whatever the timer says (not while hidden). */
  kick(): void;
}

export function startPoll(fn: () => Promise<unknown> | unknown, opts: PollOptions, env: PollEnv): Poller {
  const started = env.now();
  const maxMs = Math.max(opts.maxMs ?? opts.everyMs, opts.everyMs);
  let delay = opts.everyMs;
  let timer: unknown = null;
  let running = false;
  let stopped = false;
  let lastRun = -Infinity;

  const expired = () => opts.deadlineMs !== undefined && env.now() - started >= opts.deadlineMs;

  function schedule(ms: number): void {
    if (timer !== null) env.clearTimeout(timer);
    timer = stopped ? null : env.setTimeout(tick, ms);
  }

  async function run(): Promise<void> {
    if (running || stopped) return;
    if (expired()) return stop();
    running = true;
    lastRun = env.now();
    try {
      await fn();
    } catch {
      // A failed run is the next one's to retry.
    } finally {
      running = false;
    }
    if (stopped) return;
    delay = Math.min(delay * (opts.factor ?? 1), maxMs);
    if (!env.hidden()) schedule(delay);
  }

  function tick(): void {
    timer = null;
    // Hidden: nothing is asked; the page catches up once when it shows again.
    if (env.hidden()) return;
    void run();
  }

  const unsubscribe = env.onVisibility(() => {
    if (stopped) return;
    if (env.hidden()) {
      if (timer !== null) env.clearTimeout(timer);
      timer = null;
      return;
    }
    if (running || timer !== null) return;
    const due = env.now() - lastRun >= delay;
    if (due) void run();
    else schedule(delay - (env.now() - lastRun));
  });

  function stop(): void {
    stopped = true;
    if (timer !== null) env.clearTimeout(timer);
    timer = null;
    unsubscribe();
  }

  if (opts.immediate === false || env.hidden()) {
    if (!env.hidden()) schedule(delay);
    lastRun = opts.immediate === false ? env.now() : -Infinity;
  } else {
    void run();
  }

  return {
    stop,
    reset() {
      delay = opts.everyMs;
      if (!running && !env.hidden() && !stopped) schedule(delay);
    },
    kick() {
      if (!env.hidden()) void run();
    },
  };
}

/** The browser's timers and visibility. */
export function browserPollEnv(): PollEnv {
  return {
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
    hidden: () => document.visibilityState === "hidden",
    onVisibility(fn) {
      document.addEventListener("visibilitychange", fn);
      return () => document.removeEventListener("visibilitychange", fn);
    },
    now: () => Date.now(),
  };
}
