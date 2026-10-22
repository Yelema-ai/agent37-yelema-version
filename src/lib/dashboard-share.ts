import "server-only";
import { instanceFetch } from "@/lib/agent37";
import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { getDashboardStateCandidatePaths } from "@/lib/dashboards";
import { newShareNumber, sealShare } from "@/lib/dashboard-token";

type State = Record<string, unknown>;

/** The dashboard state of an expert and where it lives; the first candidate path when there is none yet. */
export async function readDashboardState(agentId: string, profile: string): Promise<{ path: string; state: State; found: boolean }> {
  const paths = getDashboardStateCandidatePaths(profile);
  for (const path of paths) {
    try {
      const res = await instanceFetch(agentId, `/v1/files/content?path=${encodeURIComponent(path)}`);
      if (!res.ok) continue;
      const parsed = JSON.parse(await res.text()) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return { path, state: parsed as State, found: true };
    } catch {}
  }
  return { path: paths[0], state: {}, found: false };
}

export async function writeDashboardState(agentId: string, profile: string, path: string, state: State): Promise<boolean> {
  const res = await instanceFetch(agentId, `/v1/files/content?path=${encodeURIComponent(path)}&overwrite=true`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state, null, 1),
  });
  invalidateDashboardCache(agentId, profile);
  return res.ok;
}

/** Stamps the owner's workspace and a share number (a new one when `regenerate`); true when the state changed. */
export function stampShare(state: State, workspaceId: string, regenerate = false): boolean {
  let changed = false;
  if (state.workspace_id !== workspaceId) {
    state.workspace_id = workspaceId;
    changed = true;
  }
  if (regenerate || typeof state.share_id !== "string" || !state.share_id) {
    state.share_id = newShareNumber();
    changed = true;
  }
  return changed;
}

/** The share page of a stamped state, without any instance id in it; null when sharing is off. */
export function shareUrlOf(state: State, agentId: string, profile: string): string | null {
  if (typeof state.workspace_id !== "string" || typeof state.share_id !== "string") return null;
  const token = sealShare({ w: state.workspace_id, i: agentId, p: profile.toLowerCase(), n: state.share_id });
  return token ? `/dashboards/view?s=${token}` : null;
}
