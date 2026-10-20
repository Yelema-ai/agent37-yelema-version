import { instanceFetch } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { getDashboardMeta } from "@/lib/dashboards";
import { handleError, json } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; profile: string }> };

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id, profile } = await params;
    await requireAgentAccess(id);

    const meta = getDashboardMeta(profile);
    const isDjeneba = profile.toLowerCase().includes("djeneba");

    if (!meta) {
      return json({
        available: false,
        message: "Cet agent n’a pas de tableau de bord métier associé.",
      });
    }

    const renderBase = (process.env.RENDER_DASHBOARDS_URL || "https://yelema-dashboards.onrender.com").replace(/\/$/, "");

    let state = {
      lien: null as string | null,
      hebergeur: "render",
      maj: null as string | null,
      acces: "public" as "public" | "protege",
    };

    try {
      const res = await instanceFetch(id, `/v1/files/content?path=memory/state/tableau-de-bord-metier.json`);
      if (res.ok) {
        const text = await res.text();
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === "object") {
          state = {
            lien: typeof parsed.lien === "string" ? parsed.lien : null,
            hebergeur: typeof parsed.hebergeur === "string" ? parsed.hebergeur : "render",
            maj: typeof parsed.maj === "string" ? parsed.maj : null,
            acces: parsed.acces === "protege" ? "protege" : "public",
          };
        }
      }
    } catch {
      // Pas d'état enregistré encore sur l'instance
    }

    let teamLien: string | null = null;
    if (isDjeneba) {
      try {
        const teamRes = await instanceFetch(id, `/v1/files/content?path=memory/state/tableaux-de-l-equipe.json`);
        if (teamRes.ok) {
          const teamText = await teamRes.text();
          const parsedTeam = JSON.parse(teamText);
          if (parsedTeam && typeof parsedTeam.lien === "string") {
            teamLien = parsedTeam.lien;
          }
        }
      } catch {
        // Pas de lien d'équipe encore sur l'instance
      }
    }

    const liveLien = state.lien || `${renderBase}/${meta.modelFile}`;
    const liveTeamLien = teamLien || (isDjeneba ? `${renderBase}/index-equipe.html` : null);

    return json({
      available: true,
      modelFile: meta.modelFile,
      title: meta.title,
      role: meta.role,
      reader: meta.reader,
      kpis: meta.kpis,
      lien: liveLien,
      hebergeur: state.hebergeur || "render",
      maj: state.maj,
      acces: state.acces,
      previewUrl: `/modeles/${meta.modelFile}`,
      isDjeneba,
      teamViewLien: liveTeamLien,
    });
  } catch (e) {
    return handleError(e);
  }
}
