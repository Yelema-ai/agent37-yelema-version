import { fetchCachedDashboardState, fetchCachedFrameHtml } from "@/lib/dashboard-cache";
import { NextResponse, type NextRequest } from "next/server";
import { instanceFetch } from "@/lib/agent37";
import { getDashboardMeta } from "@/lib/dashboards";
import { authViaBackoffice } from "@/lib/runtime-config";
import { currentPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TRUSTED_FRAME_REGEX =
  /^https:\/\/(?:mstudio-frames\.onrender\.com|yelema-dashboards\.onrender\.com)\/share\/frame\/[0-9a-fA-F\-]{36}$/;

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    const profile = request.nextUrl.searchParams.get("profile");
    const rawUrl = request.nextUrl.searchParams.get("url");

    let targetUrl: string | null = null;

    // A. Cas 1 : Accès direct via agentId & profile (Protection étanche avec contrôle d'accès serveur)
    if (agentId && profile) {
      if (!/^[a-zA-Z0-9_\-]+$/.test(agentId)) {
        return new NextResponse("Identifiant d'agent invalide.", { status: 400 });
      }

      const meta = getDashboardMeta(profile);
      if (!meta) {
        return new NextResponse("Profil d'expert introuvable.", { status: 404 });
      }

      const capitalizedProfile =
        profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();

      // Contrôle strict du locataire
      const pinned = await pinnedWorkspaceId().catch(() => undefined);
      let agentWorkspaceId: string | null = pinned || null;
      let isWorkspaceMember = false;
      let currentUserEmail: string | null = null;

      if (!authViaBackoffice()) {
        const db = createAdminClient();
        const { data: agentRow } = await db
          .from("agents")
          .select("agent37_id, workspace_id")
          .eq("agent37_id", agentId)
          .maybeSingle();

        if (!agentRow) {
          return new NextResponse("Tableau de bord introuvable.", { status: 404 });
        }

        agentWorkspaceId = agentRow.workspace_id;
        if (pinned && agentWorkspaceId !== pinned) {
          return new NextResponse("Tableau de bord introuvable.", { status: 404 });
        }

        const { user } = await getSession();
        if (user) {
          currentUserEmail = user.email?.toLowerCase().trim() || null;
          if (agentWorkspaceId) {
            const { data: membership } = await db
              .from("memberships")
              .select("workspace_id")
              .eq("user_id", user.id)
              .eq("workspace_id", agentWorkspaceId)
              .maybeSingle();

            if (membership) isWorkspaceMember = true;
          }
        }
      } else {
        const me = await currentPrincipal().catch(() => null);
        if (me) {
          currentUserEmail = me.user.email?.toLowerCase().trim() || null;
          if (pinned && me.workspace.id === pinned) {
            isWorkspaceMember = true;
          }
        }
      }

      // Récupération de l'état du tableau avec cache mémoire haute performance (60s)
      const state = await fetchCachedDashboardState(agentId, profile);

      if (!state || !state.lien || typeof state.lien !== "string" || !state.lien.startsWith("https://")) {
        return new NextResponse("Tableau de bord introuvable ou non généré.", { status: 404 });
      }

      if (state.workspace_id && pinned && state.workspace_id !== pinned) {
        return new NextResponse("Tableau de bord introuvable.", { status: 404 });
      }

      // Vérification des droits d'accès
      const rawAcces = typeof state.acces === "string" ? state.acces.toLowerCase().trim() : "";
      const acces: "public" | "workspace" | "emails" =
        rawAcces === "public" ? "public" : rawAcces === "emails" ? "emails" : "workspace";

      const allowedEmails: string[] = Array.isArray(state.allowed_emails || state.allowedEmails)
        ? (state.allowed_emails || state.allowedEmails).map((e: string) => String(e).toLowerCase().trim())
        : [];

      if (acces === "workspace") {
        if (!currentUserEmail) {
          return new NextResponse("Connexion requise.", { status: 401 });
        }
        if (!isWorkspaceMember) {
          return new NextResponse("Accès réservé aux membres du workspace.", { status: 403 });
        }
      } else if (acces === "emails") {
        if (!currentUserEmail) {
          return new NextResponse("Connexion requise.", { status: 401 });
        }
        if (!allowedEmails.includes(currentUserEmail)) {
          return new NextResponse("Accès non autorisé pour cette adresse e-mail.", { status: 403 });
        }
      }

      targetUrl = state.lien;
    } else if (rawUrl) {
      // B. Cas 2 : URL explicite sécurisée (pour les vues déjà vérifiées)
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return new NextResponse("URL invalide.", { status: 400 });
      }

      if (!TRUSTED_FRAME_REGEX.test(parsed.toString())) {
        return new NextResponse("Hôte ou chemin non autorisé pour l'affichage du tableau.", { status: 403 });
      }

      targetUrl = parsed.toString();
    } else {
      return new NextResponse("Paramètres agentId/profile ou url requis.", { status: 400 });
    }

    if (!targetUrl || !TRUSTED_FRAME_REGEX.test(targetUrl)) {
      return new NextResponse("Cible de tableau non valide.", { status: 403 });
    }

    // SSRF Prevention & Cache mémoire Render (60s avec déduplication)
    const html = await fetchCachedFrameHtml(targetUrl);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy":
          "sandbox allow-scripts allow-forms allow-popups; default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval'; style-src 'unsafe-inline'; img-src data: https:;",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Erreur lors du chargement du tableau: ${msg}`, { status: 502 });
  }
}
