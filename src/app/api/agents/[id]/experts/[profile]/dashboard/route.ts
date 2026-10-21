import { agent37, instanceFetch } from "@/lib/agent37";
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
        message: "Cet agent n'a pas de tableau de bord metier associe.",
      });
    }

    let state = {
      lien: null as string | null,
      hebergeur: "render",
      maj: null as string | null,
      acces: "public" as "public" | "protege",
    };

    const capitalizedProfile = profile ? profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase() : "";
    const candidatePaths = [
      `Livrables/${capitalizedProfile}/_memoire/state/tableau-de-bord-metier.json`,
      `Livrables/${profile}/_memoire/state/tableau-de-bord-metier.json`,
      `memory/state/tableau-de-bord-metier.json`,
      `memory/state/${profile}/tableau-de-bord-metier.json`,
      `.hermes/profiles/${profile}/memory/state/tableau-de-bord-metier.json`,
    ];

    for (const p of candidatePaths) {
      try {
        const res = await instanceFetch(id, `/v1/files/content?path=${encodeURIComponent(p)}`);
        if (res.ok) {
          const text = await res.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object" && typeof parsed.lien === "string" && parsed.lien) {
            state = {
              lien: parsed.lien,
              hebergeur: typeof parsed.hebergeur === "string" ? parsed.hebergeur : "render",
              maj: typeof parsed.maj === "string" ? parsed.maj : null,
              acces: parsed.acces === "protege" ? "protege" : "public",
            };
            break;
          }
        }
      } catch {
        // try next candidate path
      }
    }

    let teamLien: string | null = null;
    if (isDjeneba) {
      const teamCandidatePaths = [
        `Livrables/Djeneba/_memoire/state/tableaux-de-l-equipe.json`,
        `Livrables/${capitalizedProfile}/_memoire/state/tableaux-de-l-equipe.json`,
        `memory/state/tableaux-de-l-equipe.json`,
      ];
      for (const p of teamCandidatePaths) {
        try {
          const teamRes = await instanceFetch(id, `/v1/files/content?path=${encodeURIComponent(p)}`);
          if (teamRes.ok) {
            const teamText = await teamRes.text();
            const parsedTeam = JSON.parse(teamText);
            if (parsedTeam && typeof parsedTeam.lien === "string" && parsedTeam.lien) {
              teamLien = parsedTeam.lien;
              break;
            }
          }
        } catch {
          // try next path
        }
      }
    }

    // Fallback: si le fichier n'est pas encore sur le disque de l'instance, verifier les derniers messages de session
    if (!state.lien) {
      try {
        const { data: sessions } = await agent37.listSessions(id, `?profile=${encodeURIComponent(profile)}`);
        if (sessions && sessions.length > 0) {
          for (const s of sessions.slice(0, 3)) {
            const detail = await agent37.getSession(id, s.id, `?profile=${encodeURIComponent(profile)}`);
            const history = detail.history || [];
            for (let i = history.length - 1; i >= 0; i--) {
              const content = history[i].content || "";
              const match = content.match(/https:\/\/[^\s\)\>\]"'`]+(?:onrender\.com|\/share\/frame\/)[^\s\)\>\]"'`]*/i);
              if (match) {
                state.lien = match[0];
                state.hebergeur = "render";
                break;
              }
            }
            if (state.lien) break;
          }
        }
      } catch {
        // Ignorer les erreurs du fallback
      }
    }

    const previewUrl = state.lien
      ? `/api/dashboards/preview?url=${encodeURIComponent(state.lien)}`
      : `/modeles/${meta.modelFile}`;

    return json({
      available: true,
      modelFile: meta.modelFile,
      title: meta.title,
      role: meta.role,
      reader: meta.reader,
      kpis: meta.kpis,
      lien: state.lien,
      hebergeur: state.hebergeur || "render",
      maj: state.maj,
      acces: state.acces,
      previewUrl,
      isDjeneba,
      teamViewLien: teamLien,
    });
  } catch (e) {
    return handleError(e);
  }
}
