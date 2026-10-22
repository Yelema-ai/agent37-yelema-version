import { NextResponse, type NextRequest } from "next/server";
import { requireAgentAccess } from "@/lib/auth";
import { resolveDashboardAccess } from "@/lib/dashboard-access";
import { fetchCachedDashboardState, fetchCachedFrameHtml } from "@/lib/dashboard-cache";
import { getDashboardMeta, isTrustedDashboardUrl } from "@/lib/dashboards";

const CSP = [
  "sandbox allow-scripts allow-popups;",
  "default-src 'none';",
  "script-src 'unsafe-inline' 'unsafe-eval';",
  "style-src 'unsafe-inline' https://fonts.googleapis.com;",
  "font-src https://fonts.gstatic.com data:;",
  "img-src data: https: blob:;",
  "connect-src https:;",
  "form-action 'none';",
].join(" ");

// The owner's own preview (agentId + profile, behind their session), or a shared reader's (`s`).
async function targetOf(request: NextRequest): Promise<{ url: string } | { status: number; error: string }> {
  const token = request.nextUrl.searchParams.get("s");
  if (token) {
    const resolved = await resolveDashboardAccess(token);
    return resolved.ok ? { url: resolved.targetUrl } : { status: resolved.status, error: resolved.error };
  }
  const agentId = request.nextUrl.searchParams.get("agentId") ?? "";
  const profile = request.nextUrl.searchParams.get("profile") ?? "";
  if (!getDashboardMeta(profile) || !/^[a-z0-9_-]+$/i.test(profile)) return { status: 404, error: "Tableau de bord introuvable." };
  try {
    await requireAgentAccess(agentId);
  } catch {
    return { status: 404, error: "Tableau de bord introuvable." };
  }
  const state = await fetchCachedDashboardState(agentId, profile);
  return state && isTrustedDashboardUrl(state.lien) ? { url: state.lien } : { status: 404, error: "Tableau de bord introuvable." };
}

export async function GET(request: NextRequest) {
  try {
    const target = await targetOf(request);
    if (!("url" in target)) return new NextResponse(target.error, { status: target.status });
    const html = await fetchCachedFrameHtml(target.url);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": CSP,
      },
    });
  } catch (err) {
    console.error("[DashboardFrame] Erreur interne:", err);
    return new NextResponse("Le tableau de bord est temporairement indisponible.", { status: 502 });
  }
}
