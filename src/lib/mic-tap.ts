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

/** A level meter on a stream; null when the browser cannot make one (no Web Audio, refused…). */
export function micMeter(stream: MediaStream): MicMeter | null {
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
