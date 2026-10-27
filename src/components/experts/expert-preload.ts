"use client";

import { apiFetch } from "@/lib/api";
import { cached, remember } from "@/lib/client-cache";
import { profileQuery } from "@/lib/profile-id";
import type { ModelsResponse } from "@/lib/types";
import type { ChatSession } from "@/components/chat/types";

// An Expert's page opens on two reads: its conversations and its models. The menu reads them ahead,
// so the page paints them at once; the same call starts the Expert's process on the instance (its
// first call boots it), which is the wait a member otherwise meets on their first message.
export const sessionsKey = (agentId: string, profile: string | null) => `sessions:${agentId}${profileQuery(profile)}`;
export const modelsKey = (agentId: string, profile: string | null) => `models:${agentId}${profileQuery(profile)}`;

// Read again at most this often: a menu hovered back and forth asks nothing more.
const FRESH_MS = 60_000;
const last = new Map<string, number>();
const inFlight = new Map<string, Promise<void>>();

export function preloadExpert(agentId: string, profile: string | null): Promise<void> {
  const key = sessionsKey(agentId, profile);
  const running = inFlight.get(key);
  if (running) return running;
  if (Date.now() - (last.get(key) ?? 0) < FRESH_MS) return Promise.resolve();
  const q = profileQuery(profile);
  const p = Promise.allSettled([
    apiFetch<{ sessions: ChatSession[] }>(`/api/agents/${agentId}/chat/sessions${q}`).then((r) => remember(key, r.sessions)),
    cached(modelsKey(agentId, profile))
      ? null
      : apiFetch<ModelsResponse>(`/api/agents/${agentId}/chat/models${q}`).then((r) => remember(modelsKey(agentId, profile), r)),
  ]).then(() => {
    last.set(key, Date.now());
    inFlight.delete(key);
  });
  inFlight.set(key, p);
  return p;
}

/** Whether the browser asked to spare data, or the network is too slow to read ahead. */
export function sparingData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return Boolean(c?.saveData) || c?.effectiveType === "slow-2g" || c?.effectiveType === "2g";
}
