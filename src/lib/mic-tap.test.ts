import { test } from "node:test";
import assert from "node:assert/strict";
import { micMeter, withMicTap } from "./mic-tap.ts";

const stream = { id: "micro" } as unknown as MediaStream;

function fakePlatform() {
  const calls: unknown[] = [];
  return {
    calls,
    isSupported: () => true,
    createPeerConnection: (c: unknown) => ({ pc: c }),
    getUserMedia: async (c: MediaStreamConstraints) => {
      calls.push(c);
      return stream;
    },
    queryMicrophonePermission: async () => "granted" as const,
    attachRemoteAudio: (s: unknown) => ({ s }),
  };
}

test("withMicTap keeps every field of the platform and only wraps getUserMedia", async () => {
  const p = fakePlatform();
  const seen: MediaStream[] = [];
  const tapped = withMicTap(p, (s) => seen.push(s));
  assert.deepEqual(Object.keys(tapped).sort(), Object.keys(p).sort());
  for (const k of Object.keys(p) as (keyof typeof p)[]) if (k !== "getUserMedia") assert.equal(tapped[k], p[k]);
  const got = await tapped.getUserMedia({ audio: true });
  assert.equal(got, stream);
  assert.deepEqual(p.calls, [{ audio: true }]);
  assert.deepEqual(seen, [stream]);
});

test("a meter that throws does not stop the call from getting its microphone", async () => {
  const tapped = withMicTap(fakePlatform(), () => {
    throw new Error("no meter");
  });
  assert.equal(await tapped.getUserMedia({ audio: true }), stream);
});

test("micMeter is null when AudioContext fails, and the tap still hands the stream", async () => {
  const g = globalThis as { AudioContext?: unknown };
  const before = g.AudioContext;
  g.AudioContext = class {
    constructor() {
      throw new Error("AudioContext refused");
    }
  };
  try {
    assert.equal(micMeter(stream), null);
    let meter: unknown = "unset";
    const tapped = withMicTap(fakePlatform(), (s) => (meter = micMeter(s)));
    assert.equal(await tapped.getUserMedia({ audio: true }), stream);
    assert.equal(meter, null);
  } finally {
    g.AudioContext = before;
  }
});

test("micMeter is null where there is no Web Audio at all", () => {
  const g = globalThis as { AudioContext?: unknown };
  const before = g.AudioContext;
  delete g.AudioContext;
  try {
    assert.equal(micMeter(stream), null);
  } finally {
    g.AudioContext = before;
  }
});
