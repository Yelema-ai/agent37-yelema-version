import { type NextRequest } from "next/server";
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
import { authViaBackoffice } from "@/lib/runtime-config";
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

/**
 * Valide les paramètres, l'isolation locataire et les permissions d'accès au tableau de bord.
 * Partagé entre /api/dashboards/shared et /api/dashboards/frame pour garantir une étanchéité parfaite.
 */
export async function resolveDashboardAccess(request: NextRequest): Promise<ResolvedDashboardAccess> {
  const agentId = request.nextUrl.searchParams.get("agentId");
  const profile = request.nextUrl.searchParams.get("profile");

  if (!agentId || !/^[a-zA-Z0-9_\-]+$/.test(agentId) || !profile || !/^[a-z0-9_-]+$/i.test(profile)) {
    return {
      ok: false,
      status: 400,
      error: "Paramètres agentId et profile requis et valides.",
    };
  }

  const meta = getDashboardMeta(profile);
  if (!meta) {
    return {
      ok: false,
      status: 404,
      error: "Profil d'expert introuvable.",
      reason: "not_found",
    };
  }

  // 1. Contrôle strict du locataire (Tenant isolation)
  const pinned = await pinnedWorkspaceId().catch(() => undefined);
  const isBackoffice = authViaBackoffice();

  let agentWorkspaceId: string | null = pinned || null;
  let isWorkspaceMember = false;
  let isWorkspaceAdmin = false;
  let currentUserEmail: string | null = null;

  if (!isBackoffice) {
    const db = createAdminClient();
    const { data: agentRow } = await db
      .from("agents")
      .select("agent37_id, workspace_id")
      .eq("agent37_id", agentId)
      .maybeSingle();

    if (!agentRow) {
      return {
        ok: false,
        status: 404,
        error: "Tableau de bord introuvable.",
        reason: "not_found",
      };
    }

    agentWorkspaceId = agentRow.workspace_id;
    if (pinned && agentWorkspaceId !== pinned) {
      return {
        ok: false,
        status: 404,
        error: "Tableau de bord introuvable.",
        reason: "not_found",
      };
    }

    const { user } = await getSession();
    if (user) {
      currentUserEmail = user.email?.toLowerCase().trim() || null;
      if (agentWorkspaceId) {
        const { data: membership } = await db
          .from("memberships")
          .select("workspace_id, role")
          .eq("user_id", user.id)
          .eq("workspace_id", agentWorkspaceId)
          .maybeSingle();

        if (membership) {
          isWorkspaceMember = true;
          if (membership.role === "admin" || membership.role === "owner") {
            isWorkspaceAdmin = true;
          }
        }
      }
    }
  } else {
    // Mode Back-Office (app.yelema.ai)
    const me = await currentPrincipal().catch(() => null);
    if (me) {
      currentUserEmail = me.user.email?.toLowerCase().trim() || null;
      const currentUserWorkspaceId = me.workspace.id || null;
      if (pinned && currentUserWorkspaceId === pinned) {
        isWorkspaceMember = true;
        if (me.user.role === "admin") {
          isWorkspaceAdmin = true;
        }
      }
    }
  }

  // 2. Récupération de l'état du tableau de bord (cache mémoire 30s dédupliqué)
  const state = await fetchCachedDashboardState(agentId, profile);
  if (!state || !state.lien || typeof state.lien !== "string" || !isTrustedDashboardUrl(state.lien)) {
    return {
      ok: false,
      status: 404,
      error: "Tableau de bord introuvable ou non généré.",
      reason: "not_found",
    };
  }

  // 3. Normalisation et vérification des droits
  const acces = normalizeDashboardAccess(state.acces);
  const rawList = state.allowed_emails || state.allowedEmails;
  const allowedEmails: string[] = Array.isArray(rawList)
    ? rawList
        .filter((e: unknown): e is string => typeof e === "string")
        .map((e: string) => e.toLowerCase().trim())
    : [];

  const evalResult = evaluateDashboardAccess({
    acces,
    allowedEmails,
    stateWorkspaceId: state.workspace_id,
    pinnedWorkspaceId: isBackoffice ? pinned : (agentWorkspaceId || pinned),
    isBackoffice,
    currentUserEmail,
    isWorkspaceMember,
    isWorkspaceAdmin,
  });

  if (!evalResult.allowed) {
    return {
      ok: false,
      status: evalResult.status,
      error: evalResult.message,
      reason: evalResult.reason,
      acces,
      currentUserEmail,
    };
  }

  return {
    ok: true,
    agentId,
    profile,
    state,
    meta,
    targetUrl: state.lien,
    acces,
    currentUserEmail,
  };
}
