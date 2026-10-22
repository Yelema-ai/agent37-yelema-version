import { invalidateDashboardCache } from "@/lib/dashboard-cache";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { agent37, instanceFetch } from "@/lib/agent37";
import { requireAgentAccess } from "@/lib/auth";
import { getDashboardMeta, getDashboardStateCandidatePaths, normalizeDashboardAccess } from "@/lib/dashboards";
import { handleError, json, readJson } from "@/lib/http";

type Ctx = { params: Promise<{ id: string; profile: string }> };

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
      acces: "workspace" as "public" | "workspace" | "emails",
      allowedEmails: [] as string[],
      pdfPath: null as string | null,
      htmlPath: null as string | null,
    };

    const capitalizedProfile = profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();
    const candidatePaths = getDashboardStateCandidatePaths(profile);

    let foundFichiersFolder: string | null = null;
    let foundFileContent: Record<string, unknown> | null = null;
    let foundFilePath: string | null = null;

    for (const p of candidatePaths) {
      try {
        const res = await instanceFetch(id, `/v1/files/content?path=${encodeURIComponent(p)}`);
        if (res.ok) {
          const text = await res.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object" && typeof parsed.lien === "string" && parsed.lien) {
            const parsedAcces = normalizeDashboardAccess(parsed.acces);

            const parsedEmails = Array.isArray(parsed.allowed_emails)
              ? parsed.allowed_emails.filter((x: unknown): x is string => typeof x === "string")
              : [];

            state = {
              lien: parsed.lien,
              hebergeur: typeof parsed.hebergeur === "string" ? parsed.hebergeur : "render",
              maj: typeof parsed.maj === "string" ? parsed.maj : null,
              acces: parsedAcces,
              allowedEmails: parsedEmails,
              pdfPath: null,
              htmlPath: null,
            };

            if (typeof parsed.fichiers === "string" && parsed.fichiers.trim()) {
              foundFichiersFolder = parsed.fichiers.trim();
            }
            foundFileContent = parsed;
            foundFilePath = p;
            break;
          }
        }
      } catch {
        // try next candidate path
      }
    }

    // Auto-stamp workspace_id si manquant lors de la consultation par le propriétaire
    const pinned = await pinnedWorkspaceId().catch(() => undefined);
    if (pinned && foundFileContent && foundFilePath && !foundFileContent.workspace_id) {
      try {
        foundFileContent.workspace_id = pinned;
        await instanceFetch(
          id,
          `/v1/files/content?path=${encodeURIComponent(foundFilePath)}&overwrite=true`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(foundFileContent, null, 1),
          }
        );
        invalidateDashboardCache(id, profile);
      } catch {}
    }

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
      acces: state.acces,
      allowedEmails: state.allowedEmails,
      pdfPath: state.pdfPath,
      htmlPath: state.htmlPath,
      previewUrl,
      isDjeneba,
      teamViewLien: teamLien,
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const { id, profile } = await params;

    // 1. Validation stricte du profil : rejette ../ et profils inconnus
    if (!profile || !/^[a-z0-9_-]+$/i.test(profile)) {
      return json({ error: "Profil d'expert invalide." }, 400);
    }
    const meta = getDashboardMeta(profile);
    if (!meta) {
      return json({ error: "Profil d'expert introuvable." }, 404);
    }

    // 2. Exiger le rôle admin pour configurer les droits de partage
    await requireAgentAccess(id, "admin");

    // 3. Normaliser la règle d'accès : défaut strict à "workspace" (et non "public")
    const body = await readJson<{ acces?: string; allowedEmails?: string[] }>(request);
    const acces = normalizeDashboardAccess(body.acces);
    const allowedEmails = Array.isArray(body.allowedEmails)
      ? body.allowedEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean)
      : [];

    const candidatePaths = getDashboardStateCandidatePaths(profile);
    let targetPath = candidatePaths[0];
    let existingContent: Record<string, unknown> = {};

    for (const p of candidatePaths) {
      try {
        const res = await instanceFetch(id, `/v1/files/content?path=${encodeURIComponent(p)}`);
        if (res.ok) {
          const text = await res.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === "object") {
            targetPath = p;
            existingContent = parsed;
            break;
          }
        }
      } catch {}
    }

    const pinned = await pinnedWorkspaceId().catch(() => undefined);
    if (pinned) {
      existingContent.workspace_id = pinned;
    }
    existingContent.acces = acces;
    existingContent.allowed_emails = allowedEmails;

    const putRes = await instanceFetch(
      id,
      `/v1/files/content?path=${encodeURIComponent(targetPath)}&overwrite=true`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(existingContent, null, 1),
      }
    );

    if (!putRes.ok) {
      return json({ error: "Impossible d'enregistrer les droits de partage sur l'instance." }, 502);
    }

    invalidateDashboardCache(id, profile);

    return json({
      ok: true,
      acces,
      allowedEmails,
    });
  } catch (e) {
    return handleError(e);
  }
}
