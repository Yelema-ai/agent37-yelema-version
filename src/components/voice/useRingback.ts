"use client";

import { useEffect } from "react";
import { newAudioContext } from "@/lib/mic-tap";

// The ringback heard while the call is being put through, like a phone: 440 Hz, 1.5 s on, 3.5 s
// off (the French tone). Synthesised, no file to load; it stops as soon as the line is open.
const ON_S = 1.5;
const CYCLE_S = 5;
const VOLUME = 0.08;

export function useRingback(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    let ctx: AudioContext;
    try {
      ctx = newAudioContext();
    } catch {
      return;
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    const tone = ctx.createOscillator();
    tone.frequency.value = 440;
    tone.connect(gain);
    tone.start();
    // A few minutes of cycles scheduled ahead; ramps avoid clicks at each edge.
    for (let t = ctx.currentTime, i = 0; i < 60; i++, t += CYCLE_S) {
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(VOLUME, t + 0.02);
      gain.gain.setValueAtTime(VOLUME, t + ON_S - 0.02);
      gain.gain.linearRampToValueAtTime(0, t + ON_S);
    }
    return () => {
      tone.stop();
      void ctx.close().catch(() => {});
    };
  }, [active]);
}

// The end tone when a call the expert had answered ends: three short beeps at 425 Hz, like a line
// that hangs up. Synthesised, nothing to load; played once and released.
const BEEPS = 3;
const BEEP_S = 0.16;
const GAP_S = 0.12;

export function playHangupTone(): void {
  let ctx: AudioContext;
  try {
    ctx = newAudioContext();
  } catch {
    return;
  }
  const gain = ctx.createGain();
  gain.gain.value = 0;
  gain.connect(ctx.destination);
  const tone = ctx.createOscillator();
  tone.frequency.value = 425;
  tone.connect(gain);
  const t0 = ctx.currentTime + 0.02;
  for (let i = 0; i < BEEPS; i++) {
    const t = t0 + i * (BEEP_S + GAP_S);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(VOLUME, t + 0.015);
    gain.gain.setValueAtTime(VOLUME, t + BEEP_S - 0.015);
    gain.gain.linearRampToValueAtTime(0, t + BEEP_S);
  }
  const end = t0 + BEEPS * (BEEP_S + GAP_S);
  tone.start(t0);
  tone.stop(end);
  // Released when the beeps end, or after their time if they never played (a context Safari kept
  // suspended never fires `ended`): Safari allows only a few contexts at once.
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    void ctx.close().catch(() => {});
  };
  tone.onended = close;
  setTimeout(close, (end + 0.5) * 1000);
}
