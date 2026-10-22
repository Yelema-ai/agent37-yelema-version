import { NextResponse, type NextRequest } from "next/server";
import { resolveDashboardAccess } from "@/lib/dashboard-access";
import { fetchCachedFrameHtml } from "@/lib/dashboard-cache";

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveDashboardAccess(request);

    if (!resolved.ok) {
      return new NextResponse(resolved.error, { status: resolved.status });
    }

    // SSRF Prevention & Cache mémoire Render (30s avec déduplication)
    const html = await fetchCachedFrameHtml(resolved.targetUrl);

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": [
          "sandbox allow-scripts allow-popups;",
          "default-src 'none';",
          "script-src 'unsafe-inline' 'unsafe-eval';",
          "style-src 'unsafe-inline' https://fonts.googleapis.com;",
          "font-src https://fonts.gstatic.com data:;",
          "img-src data: https: blob:;",
          "connect-src https:;",
          "form-action 'none';",
        ].join(" "),
      },
    });
  } catch (err) {
    console.error("[DashboardFrame] Erreur interne:", err);
    return new NextResponse("Le tableau de bord est temporairement indisponible.", { status: 502 });
  }
}
