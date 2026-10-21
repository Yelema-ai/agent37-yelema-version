import { NextResponse, type NextRequest } from "next/server";
import { instanceFetch } from "@/lib/agent37";
import { getDashboardMeta } from "@/lib/dashboards";
import { authViaBackoffice } from "@/lib/runtime-config";
import { currentPrincipal } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { getSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const agentId = request.nextUrl.searchParams.get("agentId");
    const profile = request.nextUrl.searchParams.get("profile");

    if (!agentId || !profile) {
      return NextResponse.json(
        { ok: false, error: "Paramètres agentId et profile requis." },
        { status: 400 }
      );
    }

    const meta = getDashboardMeta(profile);
    const capitalizedProfile =
      profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();

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

    if (!state) {
      return NextResponse.json(
        { ok: false, error: "Tableau de bord introuvable ou non généré." },
        { status: 404 }
      );
    }

    // Normaliser l'accès
    const acces: "public" | "workspace" | "emails" =
      state.acces === "workspace" || state.acces === "emails"
        ? state.acces
        : "public";

    const allowedEmails: string[] = Array.isArray(state.allowed_emails || state.allowedEmails)
      ? (state.allowed_emails || state.allowedEmails).map((e: string) => String(e).toLowerCase().trim())
      : [];

    // Récupérer le contexte utilisateur connecté s'il existe
    let currentUserEmail: string | null = null;
    let currentUserWorkspaceId: string | null = null;

    if (authViaBackoffice()) {
      const me = await currentPrincipal();
      if (me) {
        currentUserEmail = me.user.email?.toLowerCase().trim() || null;
        currentUserWorkspaceId = me.workspace.id || null;
      }
    } else {
      const { user } = await getSession();
      if (user) {
        currentUserEmail = user.email?.toLowerCase().trim() || null;
      }
    }

    // 1. Mode PUBLIC : accessible à tous
    if (acces === "public") {
      return NextResponse.json({
        ok: true,
        acces: "public",
        lien: state.lien,
        maj: state.maj,
        title: meta?.title || `Tableau de bord - ${capitalizedProfile}`,
        description: meta?.role || "",
        pdfPath: state.pdfPath || null,
        htmlPath: state.htmlPath || null,
        currentUserEmail,
      });
    }

    // 2. Mode WORKSPACE : réservé aux membres du workspace
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

      const pinned = await pinnedWorkspaceId();
      if (pinned && currentUserWorkspaceId && currentUserWorkspaceId !== pinned) {
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
        maj: state.maj,
        title: meta?.title || `Tableau de bord - ${capitalizedProfile}`,
        description: meta?.role || "",
        pdfPath: state.pdfPath || null,
        htmlPath: state.htmlPath || null,
        currentUserEmail,
      });
    }

    // 3. Mode EMAILS : réservé aux adresses email spécifiques
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
        maj: state.maj,
        title: meta?.title || `Tableau de bord - ${capitalizedProfile}`,
        description: meta?.role || "",
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
