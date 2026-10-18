"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VoiceCall, webPlatform, type AethexError, type WebRTCPlatform } from "@aethexai/react/core";
import type { VoiceLanguage } from "@/lib/voice";
import { firstTurn, rms, stepTurn, type CallPhase, type TurnState } from "@/lib/call-turns";
import { playHangupTone } from "./useRingback";

// One call with an expert, from the browser. Signaling goes to this app's own /api/voice, which adds
// the session and the workspace; only the audio goes straight to Aethex (WebRTC). Ported from the
// voice app's aethexCall.ts. The SDK says nothing of turns: "speaking" is read from the expert's output
// level, and "thinking" (between the end of the member's sentence and the expert's voice) from the
// member's microphone too, measured on the very stream the SDK sends (src/lib/call-turns.ts).
//
// « Réfléchis plus longtemps » and « Laisse-moi finir » are the mobile app's two switches. The SDK
// does not carry them to the expert yet (as on mobile: an Aethex dependency); here they lengthen
// the thinking wait and keep the member's pauses from ending their turn.

export type { CallPhase };

const VOICE_BASE = "/api/voice";
const LEVEL_MS = 80;

function messageOf(e: AethexError): string | null {
  if (e.code === "mic_denied" || e.code === "mic_missing") return "Autorisez le micro pour appeler vos experts.";
  if (e.code === "unsupported_browser") return "Ce navigateur ne permet pas les appels. Essayez Chrome, Edge ou Safari à jour.";
  if (e.code === "quota_exceeded" || e.code === "payment_required" || e.code === "capacity") return "Service vocal indisponible. Réessayez dans un instant.";
  return null;
}

export interface UseVoiceCall {
  phase: CallPhase;
  /** Why the call could not go on, in French; null when it ended normally. */
  reason: string | null;
  muted: boolean;
  /** « Réfléchis plus longtemps » and « Laisse-moi finir ». */
  longer: boolean;
  holding: boolean;
  /** Seconds since the expert picked up. */
  elapsed: number;
  start(input: { expert: string; language: VoiceLanguage; voice: string | null }): void;
  hangUp(): void;
  setMuted(muted: boolean): void;
  /** Each returns the new state. */
  toggleLonger(): boolean;
  toggleHold(): boolean;
}

// The member's microphone level, read from the stream the SDK opened (no second capture).
function micMeter(stream: MediaStream): { level(): number; close(): void } | null {
  try {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    return {
      level: () => {
        analyser.getFloatTimeDomainData(buf);
        return rms(buf);
      },
      close: () => void ctx.close().catch(() => {}),
    };
  } catch {
    return null;
  }
}

export function useVoiceCall(): UseVoiceCall {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [reason, setReason] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [longer, setLonger] = useState(false);
  const [holding, setHolding] = useState(false);
  const call = useRef<VoiceCall | null>(null);
  const mic = useRef<ReturnType<typeof micMeter>>(null);
  const timers = useRef<ReturnType<typeof setInterval>[]>([]);
  const phaseRef = useRef<CallPhase>("idle");
  const switches = useRef({ muted: false, longer: false, holding: false });
  const answered = useRef(false);

  const go = useCallback((next: CallPhase) => {
    if (phaseRef.current === "ended" || phaseRef.current === "unreachable") return;
    // The short end tone, once, when a call the expert had answered ends (either side).
    if (next === "ended" && answered.current) playHangupTone();
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const release = useCallback(() => {
    timers.current.forEach(clearInterval);
    timers.current = [];
    call.current?.stop();
    call.current = null;
    mic.current?.close();
    mic.current = null;
  }, []);

  const fail = useCallback(
    (why: string | null) => {
      release();
      setReason(why ?? "L’expert est injoignable pour le moment. Réessayez dans un instant.");
      go("unreachable");
    },
    [go, release]
  );

  // Turns from the two levels; a reconnection starts them again.
  const meter = useCallback(() => {
    let turn: TurnState = firstTurn();
    return () => {
      const state = phaseRef.current;
      if (state !== "listening" && state !== "speaking" && state !== "thinking") {
        turn = firstTurn();
        return;
      }
      const sw = switches.current;
      turn = stepTurn(turn, {
        now: Date.now(),
        voice: call.current?.getOutputLevel() ?? 0,
        mic: sw.muted ? 0 : (mic.current?.level() ?? 0),
        holding: sw.holding,
        longer: sw.longer,
      });
      if (turn.phase !== state) go(turn.phase);
    };
  }, [go]);

  const start = useCallback<UseVoiceCall["start"]>(
    ({ expert, language, voice }) => {
      release();
      phaseRef.current = "connecting";
      setPhase("connecting");
      setReason(null);
      setElapsed(0);
      answered.current = false;
      switches.current = { muted: false, longer: false, holding: false };
      setMutedState(false);
      setLonger(false);
      setHolding(false);
      // The SDK's own browser adapter, with the microphone stream also measured.
      const platform: WebRTCPlatform = {
        ...webPlatform,
        getUserMedia: async (constraints) => {
          const stream = await webPlatform.getUserMedia(constraints);
          mic.current?.close();
          mic.current = micMeter(stream);
          return stream;
        },
      };
      let refusal: string | null = null;
      // The back office's refusal ("Cet expert n'est pas encore disponible.") is in the body, which the SDK does not read.
      const fetchImpl: typeof fetch = async (input, init) => {
        const res = await fetch(input, init);
        if (!res.ok && String(input).endsWith(`${VOICE_BASE}/calls`)) {
          refusal = ((await res.clone().json().catch(() => null)) as { error?: { message?: string } } | null)?.error?.message ?? null;
        }
        return res;
      };
      let connected = false;
      try {
        const c = new VoiceCall({
          agentId: "yelema", // ignored: the back office picks the agent
          apiBaseUrl: VOICE_BASE,
          endpoints: { connect: "calls", offer: "calls/:id/offer", ice: "calls/:id/ice", end: "calls/:id/end", status: "calls/:id/status" },
          headers: { "X-Yelema-Expert": expert, "X-Yelema-Language": language, ...(voice ? { "X-Yelema-Voice": voice } : {}) },
          fetchImpl,
          platform,
          callbacks: {
            onStatusChange: (s) => {
              if (s === "connected" && !connected) {
                connected = true;
                answered.current = true;
                go("listening");
                const t0 = Date.now();
                timers.current.push(setInterval(meter(), LEVEL_MS), setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000));
              } else if (s === "ended") {
                release();
                go("ended");
              }
            },
            onPeerStateChange: (p) => {
              if (!connected) return;
              if (p === "disconnected" || p === "failed") go("reconnecting");
              else if (p === "connected" && phaseRef.current === "reconnecting") go("listening");
            },
            onError: (e) => fail(refusal ?? messageOf(e)),
            onClose: () => {
              release();
              go("ended");
            },
          },
        });
        call.current = c;
        c.start().catch(() => fail(refusal));
      } catch {
        fail(refusal);
      }
    },
    [fail, go, meter, release]
  );

  const hangUp = useCallback(() => {
    release();
    go("ended");
  }, [go, release]);

  const setMuted = useCallback((m: boolean) => {
    switches.current.muted = m;
    setMutedState(m);
    call.current?.setMuted(m);
  }, []);

  const toggleLonger = useCallback(() => {
    const on = !switches.current.longer;
    switches.current.longer = on;
    setLonger(on);
    return on;
  }, []);

  const toggleHold = useCallback(() => {
    const on = !switches.current.holding;
    switches.current.holding = on;
    setHolding(on);
    return on;
  }, []);

  // Leaving the page hangs up: the SDK sends `end`, and the back office closes the call at Aethex.
  useEffect(() => release, [release]);

  return { phase, reason, muted, longer, holding, elapsed, start, hangUp, setMuted, toggleLonger, toggleHold };
}
