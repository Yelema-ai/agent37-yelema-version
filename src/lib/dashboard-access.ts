import "server-only";
import {
  getDashboardMeta,
  normalizeDashboardAccess,
  evaluateDashboardAccess,
  isTrustedDashboardUrl,
  type DashboardAccessRule,
  type ExpertDashboardMeta,
  type StoredDashboardState,
} from "@/lib/dashboards";
import { fetchCachedDashboardState } from "@/lib/dashboard-cache";
import { openShare } from "@/lib/dashboard-token";
import { authViaBackoffice, backofficeUrl, resolverToken } from "@/lib/runtime-config";
import { currentPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type ResolvedDashboardAccess =
  | {
      ok: true;
      agentId: string;
      profile: string;
      state: StoredDashboardState;
      meta: ExpertDashboardMeta;
      targetUrl: string;
      acces: DashboardAccessRule;
      currentUserEmail: string | null;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason?: "login_required" | "forbidden" | "not_found";
      acces?: DashboardAccessRule;
      currentUserEmail?: string | null;
    };

const NOT_FOUND = { ok: false, status: 404, error: "Tableau de bord introuvable.", reason: "not_found" } as const;
const CONFIRM_TTL_MS = 60_000;
const confirmed = new Map<string, number>();

/** The back office says whether this instance is a member's of this client and carries this profile. */
async function backofficeConfirms(workspaceId: string, instance: string, profile: string): Promise<boolean> {
  const key = `${workspaceId}:${instance}:${profile}`;
  if ((confirmed.get(key) ?? 0) > Date.now()) return true;
  const base = backofficeUrl();
  const token = resolverToken();
  if (!base || !token) return false;
  const qs = new URLSearchParams({ instance, profile });
  const res = await fetch(`${base}/api/v1/app/dashboards/instance?${qs.toString()}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}`, "X-Workspace-Id": workspaceId },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404 || res.status === 401) return false;
  if (!res.ok) throw new Error(`dashboards/instance answered ${res.status}`);
  if (confirmed.size >= 1000) confirmed.clear();
  confirmed.set(key, Date.now() + CONFIRM_TTL_MS);
  return true;
}

/**
 * A shared reader's access, from the sealed `s` token only: the token's client must be this domain's,
 * the instance that client's (back office, or the `agents` table without it), the share number the
 * current one, then the dashboard's own rule.
 */
export async function resolveDashboardAccess(token: string | null): Promise<ResolvedDashboardAccess> {
  const claims = openShare(token);
  const meta = claims ? getDashboardMeta(claims.p) : null;
  if (!claims || !meta || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(claims.i)) return NOT_FOUND;
  const { w: workspaceId, i: agentId, p: profile } = claims;

  const pinned = await pinnedWorkspaceId().catch(() => undefined);
  if (pinned && pinned !== workspaceId) return NOT_FOUND;

  const isBackoffice = authViaBackoffice();
  let isWorkspaceMember = false;
  let currentUserEmail: string | null = null;

  if (isBackoffice) {
    if (!pinned || !(await backofficeConfirms(workspaceId, agentId, profile))) return NOT_FOUND;
    const me = await currentPrincipal().catch(() => null);
    if (me) {
      currentUserEmail = me.user.email?.toLowerCase().trim() || null;
      isWorkspaceMember = me.workspace.id === workspaceId;
    }
  } else {
    const db = createAdminClient();
    const { data: agentRow } = await db.from("agents").select("workspace_id").eq("agent37_id", agentId).maybeSingle();
    if (!agentRow || agentRow.workspace_id !== workspaceId) return NOT_FOUND;
    const { user } = await getSession();
    if (user) {
      currentUserEmail = user.email?.toLowerCase().trim() || null;
      const { data: membership } = await db
        .from("memberships")
        .select("workspace_id")
        .eq("user_id", user.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      isWorkspaceMember = Boolean(membership);
    }
  }

  const state = await fetchCachedDashboardState(agentId, profile);
  if (!state || !isTrustedDashboardUrl(state.lien) || state.share_id !== claims.n) return NOT_FOUND;

  const acces = normalizeDashboardAccess(state.acces);
  const rawList = state.allowed_emails || state.allowedEmails;
  const allowedEmails = Array.isArray(rawList)
    ? rawList.filter((e: unknown): e is string => typeof e === "string").map((e) => e.toLowerCase().trim())
    : [];

  const evalResult = evaluateDashboardAccess({
    acces,
    allowedEmails,
    stateWorkspaceId: state.workspace_id,
    pinnedWorkspaceId: workspaceId,
    isBackoffice: true,
    currentUserEmail,
    isWorkspaceMember,
  });
  if (!evalResult.allowed) {
    return { ok: false, status: evalResult.status, error: evalResult.message, reason: evalResult.reason, acces, currentUserEmail };
  }

  return { ok: true, agentId, profile, state, meta, targetUrl: state.lien as string, acces, currentUserEmail };
}
