"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

// Whether this instance's runtime serves the Hermes-only screens (messaging channels).
// `null` while unknown; a read that failed counts as Hermes (as the route does without the gateway).
export function useRuntimeTools(agentId: string | null): boolean | null {
  const [state, setState] = useState<{ agentId: string; hermesTools: boolean } | null>(null);
  useEffect(() => {
    if (!agentId) return;
    let alive = true;
    apiFetch<{ hermesTools: boolean }>(`/api/agents/${agentId}/capabilities`).then(
      (r) => alive && setState({ agentId, hermesTools: r.hermesTools }),
      () => alive && setState({ agentId, hermesTools: true })
    );
    return () => {
      alive = false;
    };
  }, [agentId]);
  return state && state.agentId === agentId ? state.hermesTools : null;
}
