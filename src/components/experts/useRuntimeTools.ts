"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cachedFetch } from "@/lib/client-cache";

// Fixed for an image version: read once per page and instance, shared by every screen.
const CAPS_TTL_MS = 10 * 60_000;

export const runtimeToolsOf = (agentId: string) =>
  cachedFetch(`caps:${agentId}`, () => apiFetch<{ hermesTools: boolean }>(`/api/agents/${agentId}/capabilities`).then((r) => r.hermesTools), CAPS_TTL_MS);

// Whether this instance's runtime serves the Hermes-only screens (messaging channels).
// `null` while unknown; a read that failed counts as Hermes (as the route does without the gateway).
export function useRuntimeTools(agentId: string | null): boolean | null {
  const [state, setState] = useState<{ agentId: string; hermesTools: boolean } | null>(null);
  useEffect(() => {
    if (!agentId) return;
    let alive = true;
    runtimeToolsOf(agentId).then(
      (hermesTools) => alive && setState({ agentId, hermesTools }),
      () => alive && setState({ agentId, hermesTools: true })
    );
    return () => {
      alive = false;
    };
  }, [agentId]);
  return state && state.agentId === agentId ? state.hermesTools : null;
}
