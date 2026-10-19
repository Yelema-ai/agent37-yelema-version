"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CallPhase } from "@/lib/call-turns";
import type { UseVoiceCall } from "./useVoiceCall";
import { playHangupTone } from "./useRingback";

// A call that plays itself, for screenshots and design reviews only: no microphone, no Aethex, no
// back office. It is offered in development alone, once `localStorage["yelema.demo-appel"] = "1"`;
// a production build never takes it (see CallProvider). `window.__yelemaDemoCall.end()` makes the
// expert hang up.

export const DEMO_CALL_KEY = "yelema.demo-appel";

export function demoCallEnabled(): boolean {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DEMO_CALL_KEY) === "1";
  } catch {
    return false;
  }
}

const CYCLE: CallPhase[] = ["listening", "thinking", "speaking"];

export function useDemoCall(): UseVoiceCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [muted, setMuted] = useState(false);
  const [longer, setLonger] = useState(false);
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flags = useRef({ longer: false, holding: false });

  const stop = useCallback(() => {
    timers.current.forEach((t) => clearInterval(t));
    timers.current = [];
  }, []);

  const end = useCallback(() => {
    stop();
    playHangupTone();
    setPhase("ended");
  }, [stop]);

  const start = useCallback<UseVoiceCall["start"]>(() => {
    stop();
    setPhase("connecting");
    setElapsed(0);
    setMuted(false);
    setLonger(false);
    setHolding(false);
    flags.current = { longer: false, holding: false };
    const params = new URLSearchParams(window.location.search);
    // Start the clock where a screenshot wants it (?appel-t=42), the phase too (?appel-phase=speaking).
    const t0 = Date.now() - Number(params.get("appel-t") ?? 0) * 1000;
    const fixed = params.get("appel-phase") as CallPhase | null;
    timers.current.push(
      setTimeout(() => {
        let i = 0;
        setPhase(fixed ?? "listening");
        timers.current.push(
          setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000),
          setInterval(() => {
            if (fixed) return;
            i = (i + 1) % CYCLE.length;
            setPhase(CYCLE[i]);
          }, 3000)
        );
        setElapsed(Math.floor((Date.now() - t0) / 1000));
      }, 1200)
    );
  }, [stop]);

  useEffect(() => {
    (window as unknown as { __yelemaDemoCall?: { end: () => void } }).__yelemaDemoCall = { end };
    return stop;
  }, [end, stop]);

  return {
    phase,
    reason: null,
    muted,
    longer,
    holding,
    elapsed,
    start,
    hangUp: end,
    setMuted,
    toggleLonger: () => {
      flags.current.longer = !flags.current.longer;
      setLonger(flags.current.longer);
      return flags.current.longer;
    },
    toggleHold: () => {
      flags.current.holding = !flags.current.holding;
      setHolding(flags.current.holding);
      return flags.current.holding;
    },
  };
}
