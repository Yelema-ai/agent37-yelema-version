import { NextResponse, type NextRequest } from "next/server";

const ALLOWED_DOMAINS = [
  "mstudio-frames.onrender.com",
  "yelema-dashboards.onrender.com",
];

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get("url");
    if (!rawUrl) {
      return new NextResponse("Parametre url manquant.", { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return new NextResponse("URL invalide.", { status: 400 });
    }

    const host = parsed.hostname.toLowerCase();
    const isAllowed =
      ALLOWED_DOMAINS.includes(host) ||
      host.endsWith(".onrender.com") ||
      host === "localhost" ||
      host === "127.0.0.1";

    if (!isAllowed) {
      return new NextResponse("Hote non autorise pour l'apercu du tableau de bord.", { status: 403 });
    }

    const res = await fetch(parsed.toString(), {
      headers: {
        "User-Agent": "Mstudio-Dashboard-Preview/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Impossible de charger le tableau de bord (${res.status} ${res.statusText})`, {
        status: res.status,
      });
    }

    const html = await res.text();

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new NextResponse(`Erreur reseau lors du chargement: ${msg}`, { status: 502 });
  }
}
