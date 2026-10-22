import { NextResponse, type NextRequest } from "next/server";
import { resolveDashboardAccess } from "@/lib/dashboard-access";

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveDashboardAccess(request);

    if (!resolved.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: resolved.error,
          message: resolved.error,
          reason: resolved.reason,
          acces: resolved.acces,
          currentUserEmail: resolved.currentUserEmail,
        },
        { status: resolved.status }
      );
    }

    const { agentId, profile, state, meta, acces, currentUserEmail } = resolved;

    return NextResponse.json({
      ok: true,
      acces,
      lien: `/api/dashboards/frame?agentId=${encodeURIComponent(agentId)}&profile=${encodeURIComponent(profile)}`,
      maj: state.maj || null,
      title: meta.title,
      description: meta.role || "",
      pdfPath: state.pdfPath || null,
      htmlPath: state.htmlPath || null,
      currentUserEmail,
    });
  } catch (err) {
    console.error("[DashboardShared] Erreur interne:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur interne lors du chargement du tableau de bord." },
      { status: 500 }
    );
  }
}
