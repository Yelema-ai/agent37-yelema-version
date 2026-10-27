"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { TelegramHubStatus } from "@/lib/agent37";

const POLL_MS = 4_000;
// The manager bot's /start link lives 15 minutes: past that, waiting for Telegram is pointless.
const WAIT_MAX_MS = 15 * 60_000;
const TG_LINK = /^https:\/\/t\.me\//;

export type HubBusy = "link" | "own" | "sync" | "off" | null;
export type TelegramHubApi = ReturnType<typeof useTelegramHub>;

// The Telegram the runtime gateway prepares for an instance (Yelema bot or the member's own), read once for
// the whole screen and re-read while a step waits on Telegram. `unavailable`: no gateway for this instance.
export function useTelegramHub(agentId: string) {
  const base = `/api/agents/${agentId}/channels/telegram/hub`;
  const [status, setStatus] = useState<TelegramHubStatus | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [waitingSince, setWaitingSince] = useState<number | null>(null);
  const [busy, setBusy] = useState<HubBusy>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<TelegramHubStatus>(base));
    } catch {
      setUnavailable(true);
    }
  }, [base]);

  useEffect(() => void load(), [load]);

  const phase = status?.state?.phase;
  const waiting = waitingSince !== null;
  useEffect(() => {
    if (!(waiting || phase === "awaiting_group" || phase === "needs_topics")) return;
    if (waitingSince !== null && Date.now() - waitingSince > WAIT_MAX_MS) return setWaitingSince(null);
    const t = setTimeout(() => void load(), POLL_MS);
    return () => clearTimeout(t);
  }, [waiting, waitingSince, phase, status, load]);
  useEffect(() => {
    if (status?.state) setWaitingSince(null);
  }, [status?.state]);

  const act = async (what: NonNullable<HubBusy>, fn: () => Promise<void>): Promise<boolean> => {
    setBusy(what);
    try {
      await fn();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };

  return {
    status,
    state: status?.state ?? null,
    instanceBot: status?.instanceBot ?? null,
    unavailable,
    waiting,
    busy,
    load,
    /** A new Yelema bot (via the manager bot), or the resumption of a set-up already started. */
    connect: () =>
      act("link", async () => {
        const { url } = await apiFetch<{ url: string }>(base, { method: "POST", body: "{}" });
        if (TG_LINK.test(url)) window.open(url, "_blank", "noopener,noreferrer");
        setWaitingSince(Date.now());
        await load();
      }),
    stopWaiting: () => setWaitingSince(null),
    own: (token: string) =>
      act("own", async () => {
        await apiFetch(`${base}/own`, { method: "POST", body: JSON.stringify({ token }) });
        await load();
      }),
    sync: () =>
      act("sync", async () => {
        const out = await apiFetch<{ topics: number }>(`${base}/sync`, { method: "POST" });
        toast.success(`Sujets à jour (${out.topics})`);
        await load();
      }),
    /** Unplugs the bot (the instance lets go of it only if it is the one it listens to), or cancels a set-up. */
    disconnect: () =>
      act("off", async () => {
        await apiFetch(base, { method: "DELETE" });
        await load();
      }),
  };
}

export const isTelegramLink = (url: string | null | undefined): url is string => Boolean(url && TG_LINK.test(url));
