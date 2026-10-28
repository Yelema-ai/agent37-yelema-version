import { agent37, instanceFetch } from "@/lib/agent37";
import { getSession } from "@/lib/auth";
import { listConnections } from "@/lib/composio";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashAppsToken } from "@/lib/composio";
import { withTimeout } from "@/lib/fetch-timeout";
import { profileQuery } from "@/lib/profile-id";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { answerRpc } from "@/lib/yele-mcp";
import {
  createYeleSupervisionBackend,
  type DiscoveredExpert,
  type RawFileInfo,
  type RawSessionInfo,
} from "@/lib/yele-supervision";

export const maxDuration = 120;
const MAX_BODY_BYTES = 32_768;
const TIMEOUT_MS = 15_000;

// Script sécurisé d'interrogation de la sandbox (Node.js natif, lecture seule, pas d'injection shell)
// Extrait dynamiquement tous les experts installés dans ~/.hermes/profiles ainsi que leur nom et description SOUL.md.
const DISCOVERY_SCRIPT = `
const fs = require('fs');
const path = require('path');
const root = path.join(process.env.HOME || '/home/node', '.hermes/profiles');
const out = [];
if (fs.existsSync(root)) {
  for (const d of fs.readdirSync(root)) {
    if (d.startsWith('.') || d === 'default' || d === 'yele') continue;
    const p = path.join(root, d, 'SOUL.md');
    let name = d;
    let desc = '';
    if (fs.existsSync(p)) {
      try {
        const txt = fs.readFileSync(p, 'utf8');
        const mName = txt.match(/^name:\\s*["']?(.*?)["']?\\s*$/m);
        if (mName) name = mName[1].trim();
        const mDesc = txt.match(/^description:\\s*["']?(.*?)["']?\\s*$/m);
        if (mDesc) desc = mDesc[1].trim();
      } catch {}
    }
    out.push({ id: d, name, description: desc });
  }
}
console.log(JSON.stringify(out));
`.trim();

const DISCOVERY_B64 = Buffer.from(DISCOVERY_SCRIPT).toString("base64");
export const DISCOVER_EXPERTS_COMMAND = `node -e "$(echo '${DISCOVERY_B64}' | base64 -d)"`;

async function discoverInstalledExperts(agentId: string): Promise<DiscoveredExpert[]> {
  try {
    const res = await agent37.exec(agentId, DISCOVER_EXPERTS_COMMAND);
    if (res.exit_code === 0 && res.stdout.trim()) {
      const list = JSON.parse(res.stdout.trim()) as DiscoveredExpert[];
      if (Array.isArray(list) && list.length > 0) return list;
    }
  } catch (e) {
    console.warn("[yele-mcp] Échec découverte sandbox des experts:", e);
  }
  return [];
}

function errorJson(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

export async function POST(request: Request): Promise<Response> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();

  let agentId: string | null = null;
  let userId: string | null = null;

  // Verrouillage multi-tenant : vérifier le workspace épinglé s'il est configuré
  let pinnedWorkspace: string | undefined = undefined;
  try {
    pinnedWorkspace = await pinnedWorkspaceId();
  } catch {}

  const db = createAdminClient();

  if (token) {
    // Authentification par jeton d'instance (Hermes / yelema-hermes)
    const tokenHash = hashAppsToken(token);
    let q = db
      .from("agents")
      .select("agent37_id, user_id, workspace_id")
      .eq("apps_token_hash", tokenHash);

    if (pinnedWorkspace) {
      q = q.eq("workspace_id", pinnedWorkspace);
    }

    const { data: agent } = await q.maybeSingle();

    if (agent?.agent37_id) {
      agentId = agent.agent37_id;
      userId = agent.user_id;
    }
  }

  if (!agentId || !userId) {
    // Authentification par session utilisateur (Bulle web Yélé)
    const { user } = await getSession();
    if (user) {
      userId = user.id;
      let q = db
        .from("agents")
        .select("agent37_id, workspace_id")
        .eq("user_id", user.id);

      if (pinnedWorkspace) {
        q = q.eq("workspace_id", pinnedWorkspace);
      }

      const { data: agent } = await q
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (agent?.agent37_id) {
        agentId = agent.agent37_id;
      }
    }
  }

  if (!agentId || !userId) {
    return errorJson(401, "Non authentifié ou instance introuvable.");
  }

  const raw = await request.text();
  let message: unknown;
  try {
    if (raw.length > MAX_BODY_BYTES) throw new Error("Requête trop volumineuse.");
    message = JSON.parse(raw);
  } catch {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
      { status: 400 }
    );
  }

  const resolvedAgentId = agentId;
  const resolvedUserId = userId;

  // Cache mémoire par requête pour éviter les appels redondants vers l'instance
  let cachedExperts: DiscoveredExpert[] | null = null;
  const getExperts = async (): Promise<DiscoveredExpert[]> => {
    if (cachedExperts === null) {
      cachedExperts = await discoverInstalledExperts(resolvedAgentId);
    }
    return cachedExperts;
  };

  // Création du backend réel avec les dépendances injectées et protégées par timeout
  const backend = createYeleSupervisionBackend({
    listInstalledExperts: getExperts,
    listSessions: async (): Promise<RawSessionInfo[]> => {
      const experts = await getExperts();
      const expertIds = experts.length > 0 ? experts.map((e) => e.id) : [];

      if (expertIds.length === 0) {
        try {
          const { data } = await agent37.listSessions(resolvedAgentId);
          return data.map((s) => ({
            id: s.id,
            profile: (s as { profile?: string | null }).profile ?? null,
            last_active: s.last_active,
            started_at: s.started_at,
          }));
        } catch {
          return [];
        }
      }

      const results: RawSessionInfo[] = [];
      await Promise.all(
        expertIds.map(async (exp) => {
          try {
            const { data } = await agent37.listSessions(resolvedAgentId, profileQuery(exp));
            for (const s of data) {
              results.push({
                id: s.id,
                profile: exp,
                last_active: s.last_active,
                started_at: s.started_at,
              });
            }
          } catch {}
        })
      );
      return results;
    },
    fetchFileContent: async (path: string): Promise<string | null> => {
      try {
        const res = await instanceFetch(
          resolvedAgentId,
          `/v1/files/content?path=${encodeURIComponent(path)}`,
          withTimeout(undefined, TIMEOUT_MS)
        );
        return res.ok ? await res.text() : null;
      } catch {
        return null;
      }
    },
    listConnections: async () => {
      try {
        const { connections } = await listConnections(resolvedUserId);
        return connections.map((c) => ({
          toolkitSlug: c.toolkitSlug,
          status: c.status,
          isDisabled: c.isDisabled,
          alias: c.alias,
        }));
      } catch {
        return [];
      }
    },
    listDeliverableFiles: async (): Promise<RawFileInfo[]> => {
      try {
        const res = await instanceFetch(
          resolvedAgentId,
          `/v1/files/list?path=${encodeURIComponent("~/Livrables")}`,
          withTimeout(undefined, TIMEOUT_MS)
        );
        if (!res.ok) return [];
        const data = (await res.json()) as { files?: RawFileInfo[]; entries?: RawFileInfo[] };
        return data.files ?? data.entries ?? [];
      } catch {
        return [];
      }
    },
  });

  try {
    const batch = Array.isArray(message) ? message.slice(0, 20) : [message];
    const answers = (await Promise.all(batch.map((m) => answerRpc(m, backend)))).filter((a) => a !== null);
    if (answers.length === 0) return new Response(null, { status: 202 });
    return Response.json(Array.isArray(message) ? answers : answers[0], {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.warn("[yele-mcp] Erreur lors du traitement RPC:", e instanceof Error ? e.message : e);
    return errorJson(500, "Erreur interne du serveur de supervision.");
  }
}

export function GET(): Response {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
