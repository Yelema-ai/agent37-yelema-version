import { instanceFetch } from "@/lib/agent37";

const STATE_TTL_MS = 60_000;
const HTML_TTL_MS = 60_000;

interface CacheEntry<T> {
  at: number;
  value: T;
}

const stateStore = new Map<string, CacheEntry<any>>();
const stateFlying = new Map<string, Promise<any>>();

const htmlStore = new Map<string, CacheEntry<string>>();
const htmlFlying = new Map<string, Promise<string>>();

/**
 * Invalide le cache d'état d'un expert (ex: après un PATCH des droits d'accès).
 */
export function invalidateDashboardCache(agentId: string, profile: string): void {
  const key = `${agentId}:${profile.toLowerCase()}`;
  stateStore.delete(key);
  stateFlying.delete(key);
}

/**
 * Récupère l'état du tableau de bord d'un expert avec mise en cache mémoire (60s)
 * et déduplication des requêtes concurrentes (Promise Coalescing).
 */
export async function fetchCachedDashboardState(agentId: string, profile: string): Promise<any> {
  const key = `${agentId}:${profile.toLowerCase()}`;
  const hit = stateStore.get(key);
  if (hit && Date.now() - hit.at < STATE_TTL_MS) {
    return hit.value;
  }

  let pending = stateFlying.get(key);
  if (!pending) {
    pending = (async () => {
      const capitalizedProfile =
        profile.charAt(0).toUpperCase() + profile.slice(1).toLowerCase();

      const candidatePaths = [
        `Livrables/${capitalizedProfile}/_memoire/state/tableau-de-bord-metier.json`,
        `Livrables/${profile}/_memoire/state/tableau-de-bord-metier.json`,
        `memory/state/tableau-de-bord-metier.json`,
        `memory/state/${profile}/tableau-de-bord-metier.json`,
      ];

      let found: any = null;
      for (const p of candidatePaths) {
        try {
          const res = await instanceFetch(agentId, `/v1/files/content?path=${encodeURIComponent(p)}`);
          if (res.ok) {
            found = await res.json();
            break;
          }
        } catch {}
      }

      stateStore.set(key, { at: Date.now(), value: found });
      if (stateStore.size > 2000) {
        for (const [k, v] of stateStore) {
          if (Date.now() - v.at >= STATE_TTL_MS) stateStore.delete(k);
        }
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
 * Récupère le HTML d'une frame Render avec mise en cache mémoire (60s)
 * et déduplication des requêtes concurrentes.
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
      htmlStore.set(targetUrl, { at: Date.now(), value: html });
      if (htmlStore.size > 1000) {
        for (const [k, v] of htmlStore) {
          if (Date.now() - v.at >= HTML_TTL_MS) htmlStore.delete(k);
        }
      }
      return html;
    })().finally(() => {
      htmlFlying.delete(targetUrl);
    });

    htmlFlying.set(targetUrl, pending);
  }

  return pending;
}
