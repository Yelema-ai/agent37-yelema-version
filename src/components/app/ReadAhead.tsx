"use client";

import { useEffect } from "react";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { useOwnAgentId } from "@/components/conversations/useAllConversations";
import { preloadExpert, sparingData } from "@/components/experts/expert-preload";
import { apiFetch } from "@/lib/api";

// The instance sleeps after 30 idle minutes, and the member's next message waits for it to wake.
// While the app is on screen, one light read every 25 minutes keeps it up; a tab left in the
// background asks nothing, so a forgotten tab does not keep a machine running all night. Back on
// screen after a while, the read goes out at once: the instance wakes while the member reads. A
// screen left open with nobody at it stops asking after an hour without a click or a key.
const KEEP_AWAKE_MS = 25 * 60_000;
const AWAY_MS = 60 * 60_000;
// Gap between two Experts read ahead: one at a time, behind what the page itself loads.
const STAGGER_MS = 1_500;

export function ReadAhead() {
  const { experts } = useExpertsContext();
  const ownAgentId = useOwnAgentId();

  // Every Expert of the menu, one after the other once the page is idle.
  const list = experts.map((e) => `${e.agentId}\n${e.profileId}`).join("|");
  useEffect(() => {
    if (!list || sparingData()) return;
    let stop = false;
    const todo = list.split("|").map((s) => s.split("\n") as [string, string]);
    const next = () => {
      if (stop) return;
      const item = todo.shift();
      if (!item) return;
      void preloadExpert(item[0], item[1]).then(() => {
        if (!stop) setTimeout(() => idle(next), STAGGER_MS);
      });
    };
    const t = setTimeout(() => idle(next), STAGGER_MS);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [list]);

  useEffect(() => {
    if (!ownAgentId) return;
    let lastRead = Date.now();
    let lastSeen = Date.now();
    const seen = () => {
      lastSeen = Date.now();
    };
    const wake = () => {
      lastRead = Date.now();
      apiFetch(`/api/agents/${ownAgentId}/chat/sessions`).catch(() => {});
    };
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && Date.now() - lastSeen < AWAY_MS) wake();
    }, KEEP_AWAKE_MS);
    const onShow = () => {
      if (document.visibilityState !== "visible") return;
      seen();
      if (Date.now() - lastRead >= KEEP_AWAKE_MS) wake();
    };
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("pointerdown", seen, { passive: true });
    window.addEventListener("keydown", seen);
    return () => {
      window.removeEventListener("pointerdown", seen);
      window.removeEventListener("keydown", seen);
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [ownAgentId]);

  return null;
}

function idle(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 5_000 });
  else setTimeout(fn, 200);
}
