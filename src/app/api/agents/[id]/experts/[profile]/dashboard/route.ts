import { backoffice, BackofficeError, type BoDashboardShareView, type DashboardShareMode } from "@/lib/backoffice";
import { shareForBrowser, shareUrlOf } from "@/lib/dashboard-share";
import { agent37, instanceFetch } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { getDashboardMeta, getDashboardStateCandidatePaths } from "@/lib/dashboards";
import { ApiError, handleError, json, readJson } from "@/lib/http";
import { authViaBackoffice } from "@/lib/runtime-config";
import { readSession } from "@/lib/session";
import { pinnedWorkspaceId } from "@/lib/tenant";

type Ctx = { params: Promise<{ id: string; profile: string }> };

const MODES: readonly DashboardShareMode[] = ["team", "people", "link"];

/** The owner's back-office session; sharing is the back office's, so without it there is none. */
async function shareToken(): Promise<string> {
  const session = authViaBackoffice() ? await readSession() : null;
  if (!session) throw new ApiError(404, "not_found", "Le partage n’est pas disponible ici.");
  return session.accessToken;
}

async function shareAnswer(view: BoDashboardShareView | null) {
  return { ...shareForBrowser(view), shareUrl: shareUrlOf(await pinnedWorkspaceId().catch(() => undefined), view) };
}

export async function GET(request: Request, { params }: Ctx) {
  try {
    const { id, profile } = await params;
    if (!profile || !/^[a-z0-9_-]+$/i.test(profile)) {
      return json({ available: false, message: "Profil d'expert invalide." }, 400);
    }
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
      pdfPath: null as string | null,
      htmlPath: null as string | null,
    };

    const capitalizedProfile = profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();
    const candidatePaths = getDashboardStateCandidatePaths(profile);

    let foundFichiersFolder: string | null = null;

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
              pdfPath: null,
              htmlPath: null,
            };

            if (typeof parsed.fichiers === "string" && parsed.fichiers.trim()) {
              foundFichiersFolder = parsed.fichiers.trim();
            }
            break;
          }
        }
      } catch {
        // try next candidate path
      }
    }

    // Who may read it is the back office's; a share it cannot read is shown as not shared.
    const sharing = authViaBackoffice() && (await readSession()) !== null;
    const share = sharing ? await backoffice.dashboardShare(await shareToken(), profile).catch(() => null) : null;

    // Recherche des fichiers PDF et HTML de livrable
    try {
      const searchDirs: string[] = [];
      if (foundFichiersFolder) {
        searchDirs.push(`Livrables/${capitalizedProfile}/${foundFichiersFolder}`.replace(/\/+$/, ""));
        searchDirs.push(`Livrables/${profile}/${foundFichiersFolder}`.replace(/\/+$/, ""));
      }
      searchDirs.push(`Livrables/${capitalizedProfile}/Tableau-de-bord`);
      searchDirs.push(`Livrables/${profile}/Tableau-de-bord`);

      for (const dir of searchDirs) {
        try {
          const listRes = await agent37.listFiles(id, dir);
          const entries = listRes.entries || [];
          
          for (const entry of entries) {
            if (entry.type === "directory" && entry.name !== "archives" && !state.pdfPath) {
              try {
                const subRes = await agent37.listFiles(id, `${dir}/${entry.name}`);
                for (const sub of subRes.entries || []) {
                  if (!state.pdfPath && sub.name.toLowerCase().endsWith(".pdf")) {
                    state.pdfPath = sub.path;
                  }
                  if (!state.htmlPath && sub.name.toLowerCase().endsWith(".html")) {
                    state.htmlPath = sub.path;
                  }
                }
              } catch {}
            } else if (entry.type === "file") {
              if (!state.pdfPath && entry.name.toLowerCase().endsWith(".pdf")) {
                state.pdfPath = entry.path;
              }
              if (!state.htmlPath && entry.name.toLowerCase().endsWith(".html")) {
                state.htmlPath = entry.path;
              }
            }
          }
          if (state.pdfPath && state.htmlPath) break;
        } catch {}
      }
    } catch {
      // Ignorer les erreurs d'énumération des fichiers
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
              const match = content.match(/https:\/\/(?:mstudio-frames\.onrender\.com|yelema-dashboards\.onrender\.com)\/share\/frame\/[a-zA-Z0-9_\-]+/i);
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

    const previewUrl = state.lien || `/modeles/${meta.modelFile}`;

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
      pdfPath: state.pdfPath,
      htmlPath: state.htmlPath,
      previewUrl,
      isDjeneba,
      teamViewLien: teamLien,
      sharing,
      ...(await shareAnswer(share)),
    });
  } catch (e) {
    return handleError(e);
  }
}

// `{ mode, people?, regenerate? }`: opens or sets the share; `DELETE` stops it. The back office checks the
// expert is the caller's, keeps the rule and logs the change; nothing is written on the instance.
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id, profile } = await params;
    if (!/^[a-z0-9_-]{1,64}$/i.test(profile) || !getDashboardMeta(profile)) return json({ error: "Profil d'expert invalide." }, 400);
    await requireAgentAccess(id);
    const body = await readJson<{ mode?: unknown; people?: unknown; regenerate?: unknown }>(request);
    const mode = MODES.find((m) => m === body.mode);
    if (!mode) return json({ error: "Mode de partage inconnu." }, 400);
    const people = Array.isArray(body.people) ? body.people.filter((e): e is string => typeof e === "string").slice(0, 50) : [];
    const view = await backoffice.saveDashboardShare(await shareToken(), profile, { mode, people, regenerate: body.regenerate === true });
    return json({ ok: true, ...(await shareAnswer(view)) });
  } catch (e) {
    return shareError(e);
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id, profile } = await params;
    if (!/^[a-z0-9_-]{1,64}$/i.test(profile) || !getDashboardMeta(profile)) return json({ error: "Profil d'expert invalide." }, 400);
    await requireAgentAccess(id);
    const view = await backoffice.stopDashboardShare(await shareToken(), profile);
    return json({ ok: true, ...(await shareAnswer(view)) });
  } catch (e) {
    return shareError(e);
  }
}

/** A back-office refusal keeps its status and its sentence (written for the member); the rest as usual. */
function shareError(e: unknown) {
  if (e instanceof BackofficeError && e.status < 500) return json({ error: e.message }, e.status);
  return handleError(e);
}
