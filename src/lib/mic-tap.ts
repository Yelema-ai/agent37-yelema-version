// The member's microphone level during a call, read from the stream the voice SDK opens itself (no
// second capture). Pure, so it is tested without a browser.
import { rms } from "./call-turns.ts";

export interface MicMeter {
  level(): number;
  close(): void;
}

/**
 * The SDK's platform adapter, every field kept, with `getUserMedia` also handing the stream to
 * `onStream`. Measuring is a nicety: if it fails, the call still gets its microphone.
 */
export function withMicTap<P extends { getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> }>(platform: P, onStream: (stream: MediaStream) => void): P {
  return {
    ...platform,
    getUserMedia: async (constraints: MediaStreamConstraints) => {
      const stream = await platform.getUserMedia(constraints);
      try {
        onStream(stream);
      } catch {
        // No meter: the call goes on, « réfléchit » is simply not shown.
      }
      return stream;
    },
  };
}

/**
 * A Web Audio context, also on older Safari (`webkitAudioContext`), asked to run: one made outside a
 * click (after a network wait, or when the expert hangs up) may start suspended on Safari and iOS,
 * and a suspended context neither measures nor plays. Throws where there is no Web Audio.
 */
export function newAudioContext(): AudioContext {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctx = g.AudioContext ?? g.webkitAudioContext;
  if (!Ctx) throw new Error("no Web Audio");
  const ctx = new Ctx();
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** A level meter on a stream; null when the browser cannot make one (no Web Audio, refused…). */
export function micMeter(stream: MediaStream): MicMeter | null {
  try {
    const ctx = newAudioContext();
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
