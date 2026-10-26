import { NextResponse, type NextRequest } from "next/server";
import { resolveDashboardAccess } from "@/lib/dashboard-access";
import { deliverableKind } from "@/lib/dashboards";
import { currentPrincipal } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("s");
    const resolved = await resolveDashboardAccess(token);

    if (!resolved.ok) {
      // A refused reader sees which account they are signed in with, to switch if it is the wrong one.
      const me = resolved.reason === "forbidden" ? await currentPrincipal().catch(() => null) : null;
      return NextResponse.json(
        {
          ok: false,
          error: resolved.error,
          message: resolved.error,
          reason: resolved.reason,
          currentUserEmail: me?.user.email ?? null,
        },
        { status: resolved.status }
      );
    }

    const { state, meta, mode } = resolved;
    const s = encodeURIComponent(token ?? "");
    return NextResponse.json({
      ok: true,
      mode,
      lien: `/api/dashboards/frame?s=${s}`,
      maj: state.maj || null,
      title: meta.title,
      description: meta.role || "",
      pdfUrl: deliverableKind(state.pdfPath) === "pdf" ? `/api/dashboards/file?s=${s}&kind=pdf` : null,
      htmlUrl: deliverableKind(state.htmlPath) === "html" ? `/api/dashboards/file?s=${s}&kind=html` : null,
    });
  } catch (err) {
    console.error("[DashboardShared] Erreur interne:", err);
    return NextResponse.json(
      { ok: false, error: "Erreur interne lors du chargement du tableau de bord." },
      { status: 500 }
    );
  }
}
