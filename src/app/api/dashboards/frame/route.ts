import { NextResponse, type NextRequest } from "next/server";

// Regex stricte autorisant uniquement les frames officielles Mstudio hébergées sur Render
const TRUSTED_FRAME_REGEX =
  /^https:\/\/(?:mstudio-frames\.onrender\.com|yelema-dashboards\.onrender\.com)\/share\/frame\/[0-9a-fA-F\-]{36}$/;

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get("url");
    if (!rawUrl) {
      return new NextResponse("Paramètre url manquant.", { status: 400 });
    }

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return new NextResponse("URL invalide.", { status: 400 });
    }

    // 1. Contrôle strict de la cible : seules les frames de production officielles de Mstudio sont acceptées
    if (!TRUSTED_FRAME_REGEX.test(parsed.toString())) {
      return new NextResponse("Hôte ou chemin non autorisé pour l'affichage du tableau.", { status: 403 });
    }

    // 2. Prévention SSRF : interdiction explicite des redirections
    const res = await fetch(parsed.toString(), {
      redirect: "error",
      headers: {
        "User-Agent": "Mstudio-Dashboard/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Impossible de charger le tableau de bord (${res.status})`, {
        status: res.status,
      });
    }

    const html = await res.text();

    // 3. Headers ultra-sécurisés : CSP sandbox strict forçant une origine opaque 'null'
    // sans accès au localStorage, aux cookies ou aux API de l'application parente
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60, s-maxage=60",
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
