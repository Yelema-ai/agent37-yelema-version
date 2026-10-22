import "server-only";
import { backoffice, BackofficeError, type DashboardShareMode } from "@/lib/backoffice";
import { fetchCachedDashboardState } from "@/lib/dashboard-cache";
import { openShare } from "@/lib/dashboard-token";
import { getDashboardMeta, isTrustedDashboardUrl, type ExpertDashboardMeta, type StoredDashboardState } from "@/lib/dashboards";
import { authViaBackoffice } from "@/lib/runtime-config";
import { readSession } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";

export type ResolvedDashboardAccess =
  | { ok: true; agentId: string; profile: string; mode: DashboardShareMode; state: StoredDashboardState; meta: ExpertDashboardMeta; targetUrl: string }
  | { ok: false; status: number; error: string; reason?: "login_required" | "forbidden" | "not_found" };

const NOT_FOUND = { ok: false, status: 404, error: "Tableau de bord introuvable.", reason: "not_found" } as const;

/**
 * A shared reader's access, from the sealed `s` token only. The token's client must be this domain's;
 * the back office then says, for this reader, whether the share is open to them and which instance and
 * expert to read. Only then is the instance read, for the dashboard's address.
 */
export async function resolveDashboardAccess(token: string | null): Promise<ResolvedDashboardAccess> {
  const claims = openShare(token);
  if (!claims || !authViaBackoffice()) return NOT_FOUND;
  const pinned = await pinnedWorkspaceId().catch(() => undefined);
  if (!pinned || pinned !== claims.w) return NOT_FOUND;

  let granted: { instance: string; profile: string; mode: DashboardShareMode };
  try {
    granted = await backoffice.dashboardAccess(claims.w, claims.s, claims.n, (await readSession())?.accessToken ?? null);
  } catch (e) {
    if (!(e instanceof BackofficeError) || e.status >= 500) throw e;
    if (e.code === "login_required") return { ok: false, status: 401, error: "Connectez-vous pour ouvrir ce tableau de bord.", reason: "login_required" };
    if (e.code === "forbidden") return { ok: false, status: 403, error: "Ce tableau de bord n’est pas partagé avec vous.", reason: "forbidden" };
    return NOT_FOUND;
  }

  const meta = getDashboardMeta(granted.profile);
  if (!meta || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(granted.instance)) return NOT_FOUND;
  const state = await fetchCachedDashboardState(granted.instance, granted.profile);
  if (!state || !isTrustedDashboardUrl(state.lien)) return NOT_FOUND;
  return { ok: true, agentId: granted.instance, profile: granted.profile, mode: granted.mode, state, meta, targetUrl: state.lien };
}
