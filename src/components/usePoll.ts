"use client";

import { useEffect, useRef } from "react";
import { browserPollEnv, startPoll, type Poller, type PollOptions } from "@/lib/poll";

// Every poll of the app: stopped while the tab is hidden, one run when it shows again, one run at
// a time. `enabled` false stops it; `fn` may change without restarting the timer; a new `round`
// starts it afresh (a write that puts something back on its way).
export function usePoll(fn: () => Promise<unknown> | unknown, opts: PollOptions & { enabled?: boolean; round?: number }): React.RefObject<Poller | null> {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const poller = useRef<Poller | null>(null);
  const { enabled = true, everyMs, factor, maxMs, deadlineMs, immediate, round = 0 } = opts;
  useEffect(() => {
    if (!enabled) return;
    const p = startPoll(() => fnRef.current(), { everyMs, factor, maxMs, deadlineMs, immediate }, browserPollEnv());
    poller.current = p;
    return () => {
      p.stop();
      if (poller.current === p) poller.current = null;
    };
  }, [enabled, everyMs, factor, maxMs, deadlineMs, immediate, round]);
  return poller;
}
