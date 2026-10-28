import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { Composio } from "@composio/core";
import { ApiError } from "@/lib/http";
import { composioApiKey } from "@/lib/runtime-config";
import type {
  AgentRow,
  IntegrationConnection,
  IntegrationConnectionsResult,
  IntegrationConnectResult,
  IntegrationToolkit,
  IntegrationToolkitsResult,
} from "@/lib/types";

// Yelema's own Composio project, reached with Yelema's key (COMPOSIO_API_KEY, read at runtime). The
// key lives only on this server: the Connecteurs routes manage toolkits and connections with it,
// and the MCP proxy (src/app/api/composio-mcp/route.ts) opens the experts' tool sessions with it.
// Agent37's managed Composio is switched off in the yelema-hermes image, and the key never reaches
// an instance.
// Adapted from agent37-platform/hermes-openclaw-composio.
const COMPOSIO_API_BASE = "https://backend.composio.dev";

let cached: Composio | null = null;

function apiKey(): string {
  const key = composioApiKey();
  if (!key) throw new ApiError(503, "composio_not_configured", "Les connecteurs ne sont pas encore activés.");
  return key;
}

function client(): Composio {
  if (!cached) cached = new Composio({ apiKey: apiKey() });
  return cached;
}

// The Composio user a connection and a tool session belong to: the MEMBER who owns the instance.
// A connected Gmail is that person's, used by the experts on their own instance and by nobody
// else in the company. An instance without an owner (older rows) is its own identity. Derived
// server-side from the agents row, never from the caller.
export function composioUserId(row: Pick<AgentRow, "agent37_id" | "owner_user_id">): string {
  return row.owner_user_id ? `user:${row.owner_user_id}` : `agent:${row.agent37_id}`;
}

// The instance's MCP token is stored only as this hash (agents.apps_token_hash).
export function hashAppsToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

// ---- Catalog ---------------------------------------------------------------------------------

// Composio's Unipile only lists accounts: the member links Unipile on its own card (src/lib/unipile.ts).
export const HIDDEN_TOOLKITS: ReadonlySet<string> = new Set(["unipile"]);

export async function listToolkits(search?: string): Promise<IntegrationToolkitsResult> {
  const params = new URLSearchParams({ limit: "24" });
  if (search) params.set("search", search);
  const res = await fetch(`${COMPOSIO_API_BASE}/api/v3/toolkits?${params}`, {
    headers: { "x-api-key": apiKey() },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new ApiError(502, "composio_error", "Le catalogue des outils est indisponible. Réessayez dans un instant.");
  const data = (await res.json()) as { items?: unknown[] };
  return { items: (data.items ?? []).map(normalizeToolkit).filter((t) => !HIDDEN_TOOLKITS.has(t.slug.toLowerCase())) };
}

interface RawToolkit {
  slug?: string;
  name?: string;
  no_auth?: boolean;
  composio_managed_auth_schemes?: string[];
  auth_schemes?: string[];
  meta?: { description?: string; logo?: string };
}

function normalizeToolkit(raw: unknown): IntegrationToolkit {
  const t = (raw ?? {}) as RawToolkit;
  return {
    slug: t.slug ?? "",
    name: t.name ?? t.slug ?? "",
    description: t.meta?.description ?? null,
    logo: t.meta?.logo ?? null,
    enabled: true,
    isNoAuth: !!t.no_auth,
    authSchemes: t.composio_managed_auth_schemes ?? t.auth_schemes ?? [],
  };
}

// ---- Connect ---------------------------------------------------------------------------------

// A toolkit with no auth config in Yelema's Composio project fails with 4308 "NoManagedAuth". Several accounts
// of one tool are allowed; the alias (unique per member and tool) is what an expert names to pick one.
export async function connectToolkit(userId: string, toolkit: string, alias?: string): Promise<IntegrationConnectResult> {
  if (HIDDEN_TOOLKITS.has(toolkit.toLowerCase())) throw new ApiError(422, "use_unipile_card", "Unipile se relie avec sa carte « WhatsApp et messageries », en haut de cette page.");
  try {
    const session = await client().toolRouter.create(userId, { manageConnections: true, multiAccount: { enable: true } });
    const targetAlias = alias?.trim() || `${toolkit.toLowerCase()}-${randomBytes(3).toString("hex")}`;
    const request = await session.authorize(toolkit, { alias: targetAlias });
    return { toolkit, connectedAccountId: request.id, redirectUrl: request.redirectUrl ?? "" };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("4308") || message.includes("NoManagedAuth")) {
      throw new ApiError(422, "custom_auth_required", "Cet outil ne se connecte pas encore depuis Yelema. Écrivez-nous pour l’activer.");
    }
    console.error(`[composio] connect ${toolkit} failed for ${userId}:`, message);
    throw new ApiError(502, "composio_error", "La connexion n’a pas pu démarrer. Réessayez dans un instant.");
  }
}

// ---- Connected accounts ----------------------------------------------------------------------

interface RawConnectedAccount {
  id?: string;
  status?: string;
  userId?: string;
  user_id?: string;
  toolkit?: { slug?: string; name?: string };
  authConfig?: { id?: string; authScheme?: string };
  auth_config?: { id?: string; auth_scheme?: string };
  state?: { authScheme?: string; val?: Record<string, unknown> };
  data?: Record<string, unknown>;
  params?: Record<string, unknown>;
  alias?: string | null;
  isDisabled?: boolean;
  is_disabled?: boolean;
  createdAt?: string | number;
  created_at?: string | number;
  updatedAt?: string | number;
  updated_at?: string | number;
}

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

function findEmailInRecord(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;

  const candidateKeys = [
    "email",
    "user_email",
    "userEmail",
    "mail",
    "displayName",
    "display_name",
    "username",
    "login",
    "account_id",
  ];
  for (const k of candidateKeys) {
    const val = record[k];
    if (typeof val === "string") {
      const match = val.match(EMAIL_REGEX);
      if (match) return match[0];
    }
  }

  for (const [key, val] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("token") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("url") ||
      lowerKey.includes("scope") ||
      lowerKey.includes("key")
    ) {
      continue;
    }
    if (typeof val === "string") {
      const match = val.match(EMAIL_REGEX);
      if (match) return match[0];
    } else if (typeof val === "object" && val !== null) {
      const found = findEmailInRecord(val);
      if (found) return found;
    }
  }
  return null;
}

function findNameOrIdentity(obj: unknown): string | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const candidateKeys = [
    "displayName",
    "display_name",
    "name",
    "username",
    "login",
    "workspace_name",
    "workspaceName",
    "subdomain",
  ];
  for (const k of candidateKeys) {
    const val = record[k];
    if (typeof val === "string" && val.trim() && !val.includes("http")) {
      return val.trim();
    }
  }
  return null;
}

function extractAccountLabel(c: RawConnectedAccount): string | null {
  const data = (c.data ?? {}) as Record<string, unknown>;
  const stateVal = ((c.state as { val?: Record<string, unknown> })?.val ??
    (typeof c.state === "object" ? c.state : {})) as Record<string, unknown>;
  const params = (c.params ?? {}) as Record<string, unknown>;

  // 1. Prioritize email address (matches user request: "mieux vaut mettre l'email")
  const email = findEmailInRecord(data) || findEmailInRecord(stateVal) || findEmailInRecord(params);
  if (email) return email;

  // 2. Second priority: displayName or identity (e.g. Canva, Notion, Slack)
  const name = findNameOrIdentity(data) || findNameOrIdentity(stateVal) || findNameOrIdentity(params);
  if (name) return name;

  // 3. Third priority: User alias (ignore auto-generated ones like "gmail-2", "toolkit-1")
  if (c.alias && typeof c.alias === "string" && c.alias.trim()) {
    const trimmed = c.alias.trim();
    const isAutoAlias = /^[a-z0-9_-]+-\d+$/i.test(trimmed);
    if (!isAutoAlias) {
      return trimmed;
    }
  }

  return null;
}

function toEpochMs(value: string | number | undefined): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value > 1e12 ? value : value * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

// The SDK answers in camelCase or snake_case depending on the surface.
function normalizeConnection(raw: unknown): IntegrationConnection {
  const c = (raw ?? {}) as RawConnectedAccount;
  const status = (c.status ?? "").toUpperCase();
  return {
    id: c.id ?? "",
    status,
    userId: c.userId ?? c.user_id ?? null,
    toolkitSlug: c.toolkit?.slug ?? null,
    toolkitName: c.toolkit?.name ?? null,
    authConfigId: c.authConfig?.id ?? c.auth_config?.id ?? null,
    authScheme: c.state?.authScheme ?? c.authConfig?.authScheme ?? c.auth_config?.auth_scheme ?? null,
    isDisabled: !!(c.isDisabled ?? c.is_disabled) || status === "INACTIVE" || status === "DISABLED",
    createdAt: toEpochMs(c.createdAt ?? c.created_at),
    updatedAt: toEpochMs(c.updatedAt ?? c.updated_at),
    alias: c.alias ?? null,
    label: extractAccountLabel(c),
  };
}

export async function listConnections(userId: string): Promise<IntegrationConnectionsResult> {
  const seen = new Map<string, IntegrationConnection>();
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await client().connectedAccounts.list({
      userIds: [userId],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    for (const item of res.items ?? []) {
      const conn = normalizeConnection(item);
      if (conn.id) seen.set(conn.id, conn);
    }
    cursor = (res as { nextCursor?: string | null }).nextCursor ?? undefined;
    if (!cursor) break;
  }
  const connections = [...seen.values()].sort(
    (a, b) => (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
  );
  return { connections };
}

// Composio does not check ownership on delete: the account must belong to this member.
export async function deleteConnection(userId: string, connectedAccountId: string): Promise<{ id: string; deleted: boolean }> {
  const { connections } = await listConnections(userId);
  if (!connections.some((c) => c.id === connectedAccountId)) {
    throw new ApiError(404, "not_found", "Ce compte n’est pas connecté à votre espace.");
  }
  const res = await client().connectedAccounts.delete(connectedAccountId);
  if (!(res as { success?: boolean }).success) {
    throw new ApiError(502, "composio_error", "La déconnexion n’a pas été confirmée. Réessayez.");
  }
  return { id: connectedAccountId, deleted: true };
}

// ---- MCP tool sessions (what the proxy forwards to) ------------------------------------------

export interface McpSession {
  url: string;
  headers: Record<string, string>;
}

// `pins`: the member's default account per tool (exact: Composio uses that one, and no other, for the tool).
export async function mintMcpSession(userId: string, pins: Record<string, string[]> = {}): Promise<McpSession> {
  const session = await client().create(userId, {
    ...(Object.keys(pins).length ? { connectedAccounts: pins } : {}),
    // Keep the manage-connections tool so an expert can hand out a sign-in link in chat, allow
    // several accounts per toolkit, and drop Composio's remote sandbox.
    manageConnections: { waitForConnections: true },
    multiAccount: { enable: true },
    sandbox: { enable: false },
    toolkits: { disable: [...HIDDEN_TOOLKITS] },
    mcp: true,
  });
  const url = typeof session.mcp?.url === "string" ? session.mcp.url.trim() : "";
  if (!url) throw new Error("Composio session response has no MCP URL");

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(session.mcp?.headers ?? {})) {
    if (typeof value === "string" && value) headers[key.toLowerCase()] = value;
  }
  if (Object.keys(headers).length === 0) headers["x-api-key"] = apiKey();
  return { url, headers };
}
