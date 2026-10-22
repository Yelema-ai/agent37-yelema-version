import { NextResponse, type NextRequest } from "next/server";
import { instanceFetch } from "@/lib/agent37";
import { getDashboardMeta } from "@/lib/dashboards";
import { authViaBackoffice } from "@/lib/runtime-config";
import { currentPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    const profile = request.nextUrl.searchParams.get("profile");

    if (!agentId || !/^[a-zA-Z0-9_\-]+$/.test(agentId) || !profile) {
      return NextResponse.json(
        { ok: false, error: "Paramètres agentId et profile requis et valides." },
        { status: 400 }
      );
    }

    const meta = getDashboardMeta(profile);
    if (!meta) {
      return NextResponse.json(
        { ok: false, error: "Profil d'expert introuvable." },
        { status: 404 }
      );
    }

    const capitalizedProfile =
      profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();

    // 1. Contrôle strict du locataire (Tenant isolation)
    const pinned = await pinnedWorkspaceId().catch(() => undefined);
    let agentWorkspaceId: string | null = pinned || null;
    let isWorkspaceMember = false;
    let currentUserEmail: string | null = null;
    let currentUserWorkspaceId: string | null = null;

    if (!authViaBackoffice()) {
      const db = createAdminClient();
      const { data: agentRow } = await db
        .from("agents")
        .select("agent37_id, workspace_id")
        .eq("agent37_id", agentId)
        .maybeSingle();

      // Si l'agent n'existe pas dans la base du locataire, refuser (404 pour ne rien divulguer)
      if (!agentRow) {
        return NextResponse.json(
          { ok: false, error: "Tableau de bord introuvable." },
          { status: 404 }
        );
      }

      agentWorkspaceId = agentRow.workspace_id;

      // Si le domaine est rattaché à un espace précis, vérifier que l'expert lui appartient
      if (pinned && agentWorkspaceId !== pinned) {
        return NextResponse.json(
          { ok: false, error: "Tableau de bord introuvable." },
          { status: 404 }
        );
      }

      // Résoudre la session utilisateur et vérifier son appartenance à l'espace de l'expert
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

          if (membership) {
            currentUserWorkspaceId = membership.workspace_id;
            isWorkspaceMember = true;
          }
        }
      }
    } else {
      // Mode Back-Office
      const me = await currentPrincipal().catch(() => null);
      if (me) {
        currentUserEmail = me.user.email?.toLowerCase().trim() || null;
        currentUserWorkspaceId = me.workspace.id || null;
        if (pinned && currentUserWorkspaceId === pinned) {
          isWorkspaceMember = true;
        }
      }
    }

    // 2. Récupération de l'état du tableau de bord sur l'instance de l'agent
    const candidatePaths = [
      `Livrables/${capitalizedProfile}/_memoire/state/tableau-de-bord-metier.json`,
      `Livrables/${profile}/_memoire/state/tableau-de-bord-metier.json`,
      `memory/state/tableau-de-bord-metier.json`,
      `memory/state/${profile}/tableau-de-bord-metier.json`,
    ];

    let state: any = null;

    for (const p of candidatePaths) {
      try {
        const res = await instanceFetch(agentId, `/v1/files/content?path=${encodeURIComponent(p)}`);
        if (res.ok) {
          state = await res.json();
          break;
        }
      } catch {}
    }

    if (!state || !state.lien || typeof state.lien !== "string" || !state.lien.startsWith("https://")) {
      return NextResponse.json(
        { ok: false, error: "Tableau de bord introuvable ou non généré." },
        { status: 404 }
      );
    }

    // Si le fichier contient un identifiant de workspace, vérifier la concordance
    if (state.workspace_id && pinned && state.workspace_id !== pinned) {
      return NextResponse.json(
        { ok: false, error: "Tableau de bord introuvable." },
        { status: 404 }
      );
    }

    // 3. Normaliser l'accès avec sécurité par défaut (SECURE BY DEFAULT)
    // Sans règle explicite ou si la règle est inconnue, applique STRICTEMENT "workspace" (authentification requise)
    const rawAcces = typeof state.acces === "string" ? state.acces.toLowerCase().trim() : "";
    const acces: "public" | "workspace" | "emails" =
      rawAcces === "public"
        ? "public"
        : rawAcces === "emails"
        ? "emails"
        : "workspace";

    const allowedEmails: string[] = Array.isArray(state.allowed_emails || state.allowedEmails)
      ? (state.allowed_emails || state.allowedEmails).map((e: string) => String(e).toLowerCase().trim())
      : [];

    // 4. Application des contrôles d'accès

    // A. Mode PUBLIC : accessible à tous
    if (acces === "public") {
      return NextResponse.json({
        ok: true,
        acces: "public",
        lien: state.lien,
        maj: state.maj || null,
        title: meta.title,
        description: meta.role || "",
        pdfPath: state.pdfPath || null,
        htmlPath: state.htmlPath || null,
        currentUserEmail,
      });
    }

    // B. Mode WORKSPACE : réservé exclusivement aux membres de l'espace de travail
    if (acces === "workspace") {
      if (!currentUserEmail) {
        return NextResponse.json(
          {
            ok: false,
            reason: "login_required",
            acces: "workspace",
            message: "Ce tableau de bord est réservé aux collaborateurs de l'espace de travail. Veuillez vous connecter.",
          },
          { status: 401 }
        );
      }

      if (!isWorkspaceMember) {
        return NextResponse.json(
          {
            ok: false,
            reason: "forbidden",
            acces: "workspace",
            message: "Votre compte n'appartient pas à l'espace de travail propriétaire de ce tableau de bord.",
            currentUserEmail,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        ok: true,
        acces: "workspace",
        lien: state.lien,
        maj: state.maj || null,
        title: meta.title,
        description: meta.role || "",
        pdfPath: state.pdfPath || null,
        htmlPath: state.htmlPath || null,
        currentUserEmail,
      });
    }

    // C. Mode EMAILS : réservé aux adresses email spécifiées
    if (acces === "emails") {
      if (!currentUserEmail) {
        return NextResponse.json(
          {
            ok: false,
            reason: "login_required",
            acces: "emails",
            message: "Ce tableau de bord est réservé à des personnes spécifiques. Veuillez vous connecter avec votre adresse autorisée.",
          },
          { status: 401 }
        );
      }

      if (!allowedEmails.includes(currentUserEmail)) {
        return NextResponse.json(
          {
            ok: false,
            reason: "forbidden",
            acces: "emails",
            currentUserEmail,
            message: `L'adresse ${currentUserEmail} n'est pas autorisée à consulter ce tableau de bord. Contactez l'administrateur pour demander l'accès.`,
          },
          { status: 403 }
        );
      }

      return NextResponse.json({
        ok: true,
        acces: "emails",
        lien: state.lien,
        maj: state.maj || null,
        title: meta.title,
        description: meta.role || "",
        pdfPath: state.pdfPath || null,
        htmlPath: state.htmlPath || null,
        currentUserEmail,
      });
    }

    return NextResponse.json(
      { ok: false, error: "Type d'accès non reconnu." },
      { status: 400 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: `Erreur interne: ${msg}` },
      { status: 500 }
    );
  }
}
