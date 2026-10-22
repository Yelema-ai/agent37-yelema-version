import { NextResponse, type NextRequest } from "next/server";
import { instanceFetch } from "@/lib/agent37";
import { resolveDashboardAccess } from "@/lib/dashboard-access";
import { deliverableKind } from "@/lib/dashboards";

// The PDF or HTML export of a shared dashboard, for the same readers as the dashboard itself. The path
// comes from the expert's state file, so only a Livrables/ .pdf or .html is ever served, as a download.
export async function GET(request: NextRequest) {
  try {
    const kind = request.nextUrl.searchParams.get("kind");
    const resolved = await resolveDashboardAccess(request.nextUrl.searchParams.get("s"));
    if (!resolved.ok) return new NextResponse(resolved.error, { status: resolved.status });
    const path = kind === "pdf" ? resolved.state.pdfPath : kind === "html" ? resolved.state.htmlPath : null;
    if (!kind || deliverableKind(path) !== kind) return new NextResponse("Fichier introuvable.", { status: 404 });

    const upstream = await instanceFetch(resolved.agentId, `/v1/files/content?path=${encodeURIComponent(path as string)}&disposition=attachment`);
    if (!upstream.ok || !upstream.body) return new NextResponse("Fichier introuvable.", { status: 404 });
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": kind === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="tableau-de-bord.${kind}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (err) {
    console.error("[DashboardFile] Erreur interne:", err);
    return new NextResponse("Le fichier est temporairement indisponible.", { status: 502 });
  }
}
