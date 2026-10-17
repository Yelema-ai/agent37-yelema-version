"use client";

import { useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { splitSSE, WATCH_TTL_MS, type Outcome, type Turn } from "@/lib/activity";
import { profileQuery } from "@/lib/profile-id";
import type { SessionDetail } from "@/lib/types";
import type { ActivityActions } from "./ActivityProvider";

const POLL_MS = 8000;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(t), resolve()), { once: true });
  });

// The terminal event of a reattached stream, or null when it ends without one.
async function readTerminal(body: ReadableStream<Uint8Array>, signal: AbortSignal): Promise<{ outcome: Outcome; text: string } | null> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) return null;
      const { events, rest } = splitSSE(buffer + decoder.decode(value, { stream: true }));
      buffer = rest;
      for (const { event, data } of events) {
        if (event === "response.output_text.delta" && typeof data.text === "string") text += data.text;
        if (event === "response.completed") return { outcome: "completed", text: typeof data.output_text === "string" ? data.output_text : text };
        if (event === "response.failed") return { outcome: "failed", text: "" };
      }
    }
    return null;
  } finally {
    reader.cancel().catch(() => {});
  }
}

// Follow a turn no chat streams any more: its stream first, then the session until it names no
// running response (a stream cut by the host's time limit, or a response the gateway forgot).
async function follow(t: Turn, signal: AbortSignal): Promise<{ outcome: Outcome; text: string } | null> {
  try {
    const res = await fetch(`/api/agents/${t.agentId}/chat/responses/${encodeURIComponent(t.responseId!)}/stream`, { signal });
    if (res.ok && res.body) {
      const end = await readTerminal(res.body, signal);
      if (end) return end;
    } else {
      await res.body?.cancel().catch(() => {});
    }
  } catch {
    if (signal.aborted) return null;
  }
  const url = `/api/agents/${t.agentId}/chat/sessions/${encodeURIComponent(t.sessionId!)}${profileQuery(t.profile)}`;
  while (!signal.aborted && Date.now() - t.startedAt < WATCH_TTL_MS) {
    try {
      const s = await apiFetch<SessionDetail>(url);
      if (s.active_response_id !== t.responseId) {
        const last = [...(s.history ?? [])].reverse().find((h) => h.role === "assistant");
        return { outcome: "completed", text: last?.content ?? "" };
      }
    } catch {
      // Try again on the next round.
    }
    await sleep(POLL_MS, signal);
  }
  return null;
}

// One follower per watched turn, stopped when the turn leaves the watch (reattached, deleted).
export function useTurnWatch(turns: Record<string, Turn>, actions: ActivityActions) {
  const running = useRef(new Map<string, AbortController>());

  useEffect(() => {
    for (const [id, ctrl] of running.current) {
      if (turns[id]?.mode !== "watch") {
        ctrl.abort();
        running.current.delete(id);
      }
    }
    for (const t of Object.values(turns)) {
      if (t.mode !== "watch" || running.current.has(t.id)) continue;
      const ctrl = new AbortController();
      running.current.set(t.id, ctrl);
      void follow(t, ctrl.signal).then((end) => {
        if (ctrl.signal.aborted) return;
        running.current.delete(t.id);
        if (end) actions.finish(t.id, end.outcome, end.text, "watch");
        else actions.drop(t.id);
      });
    }
  }, [turns, actions]);

  useEffect(() => {
    const map = running.current;
    return () => {
      for (const c of map.values()) c.abort();
      map.clear();
    };
  }, []);
}
