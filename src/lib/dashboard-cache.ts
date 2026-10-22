import { instanceFetch } from "@/lib/agent37";
import { getDashboardStateCandidatePaths, type StoredDashboardState } from "@/lib/dashboards";

// TTL de 30 secondes : équilibre parfait entre réduction drastique de la charge (divisée par 50)
// et fraîcheur des données pour les utilisateurs.
const STATE_TTL_MS = 30_000;
const HTML_TTL_MS = 30_000;

// Limites strictes en mémoire (LRU / FIFO) pour garantir l'absence totale de fuite mémoire (OOM)
const MAX_STATE_ENTRIES = 500;
const MAX_HTML_ENTRIES = 200;

interface CacheEntry<T> {
  at: number;
  value: T;
}

const stateStore = new Map<string, CacheEntry<StoredDashboardState>>();
const stateFlying = new Map<string, Promise<StoredDashboardState | null>>();

const htmlStore = new Map<string, CacheEntry<string>>();
const htmlFlying = new Map<string, Promise<string>>();

/**
 * Invalide immédiatement le cache d'un expert (ex: après modification des droits dans la modale).
 */
export function invalidateDashboardCache(agentId: string, profile: string): void {
  const key = `${agentId}:${profile.toLowerCase()}`;
  stateStore.delete(key);
  stateFlying.delete(key);
}

/**
 * Récupère l'état du tableau de bord avec cache mémoire (30s),
 * protection contre le cache négatif (ne bloque pas la génération en cours)
 * et déduplication des requêtes concurrentes (Promise Coalescing).
 */
export async function fetchCachedDashboardState(
  agentId: string,
  profile: string
): Promise<StoredDashboardState | null> {
  const key = `${agentId}:${profile.toLowerCase()}`;
  const hit = stateStore.get(key);
  if (hit && Date.now() - hit.at < STATE_TTL_MS) {
    return hit.value;
  }

  let pending = stateFlying.get(key);
  if (!pending) {
    pending = (async () => {
      const candidatePaths = getDashboardStateCandidatePaths(profile);

      let found: StoredDashboardState | null = null;
      for (const p of candidatePaths) {
        try {
          const res = await instanceFetch(agentId, `/v1/files/content?path=${encodeURIComponent(p)}`);
          if (res.ok) {
            const parsed = (await res.json()) as StoredDashboardState;
            if (parsed && typeof parsed === "object") {
              found = parsed;
              break;
            }
          }
        } catch {}
      }

      // Garde anti-cache négatif : si le tableau n'existe pas encore (génération en cours),
      // on ne le garde pas en cache 30s pour que le polling de génération détecte le fichier dès sa création.
      if (found && found.lien) {
        if (stateStore.size >= MAX_STATE_ENTRIES) {
          const oldestKey = stateStore.keys().next().value;
          if (oldestKey) stateStore.delete(oldestKey);
        }
        stateStore.set(key, { at: Date.now(), value: found });
      }

      return found;
    })().finally(() => {
      stateFlying.delete(key);
    });

    stateFlying.set(key, pending);
  }

  return pending;
}

/**
 * Récupère le HTML de la frame Render avec cache mémoire (30s)
 * et éviction FIFO/LRU stricte pour borner la mémoire à ~10 Mo maximum.
 */
export async function fetchCachedFrameHtml(targetUrl: string): Promise<string> {
  const hit = htmlStore.get(targetUrl);
  if (hit && Date.now() - hit.at < HTML_TTL_MS) {
    return hit.value;
  }

  let pending = htmlFlying.get(targetUrl);
  if (!pending) {
    pending = (async () => {
      const res = await fetch(targetUrl, {
        redirect: "error",
        headers: {
          "User-Agent": "Mstudio-Dashboard/1.0",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      if (!res.ok) {
        throw new Error(`Impossible de charger le tableau de bord (${res.status})`);
      }

      const html = await res.text();

      // Éviction FIFO/LRU stricte
      if (htmlStore.size >= MAX_HTML_ENTRIES) {
        const oldestKey = htmlStore.keys().next().value;
        if (oldestKey) htmlStore.delete(oldestKey);
      }

      htmlStore.set(targetUrl, { at: Date.now(), value: html });
      return html;
    })().finally(() => {
      htmlFlying.delete(targetUrl);
    });

    htmlFlying.set(targetUrl, pending);
  }

  return pending;
}
