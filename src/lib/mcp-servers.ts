// The client's own tool servers (MCP), as the app sees them. The back office owns everything that
// matters: the rules on a name, an address and a token, the token's encryption, and the writing on
// the instances. This module only shapes what goes to it, and turns its refusal codes into the
// sentences a member reads. Contract: yelema-platform docs/specs/client-api-v1, `/app/mcp`.

import { scopePath, type SettingScope } from "./llm.ts";

export type McpAuth = "none" | "bearer";
/** Where the writing of a server on the instances stands. Not whether the server itself answers: the back office never calls it. */
export type McpState = "applied" | "pending" | "failed";

/** A server in place. Never its token: `hint` is its last four characters, null without one. */
export interface McpServer {
  /** What the removal routes take. */
  id: string;
  name: string;
  url: string;
  auth: McpAuth;
  hint: string | null;
  state: McpState;
  updatedAt: string | null;
}

export interface McpMember {
  /** What the per-member routes take. */
  id: string;
  name: string | null;
  email: string;
  servers: McpServer[];
}

export interface McpOverview {
  /** The signed-in user's own servers. */
  own: McpServer[];
  membersMayAddMcp: boolean;
  /** Admins only. */
  client?: McpServer[];
  members?: McpMember[];
}

export interface McpWritten {
  ok: true;
  state: "pending" | "applied";
  /** The server just added; absent from a removal. */
  server?: McpServer;
}

export interface McpServerDraft {
  name: string;
  url: string;
  auth: McpAuth;
  /** With `bearer` only. */
  token?: string;
}

// Loose bounds only: the back office holds the real rules (the shape of a name, a public https
// address, the characters of a token). These keep an oversized or mistyped body from travelling.

/** A server draft from a request body, with nothing but its four fields; null when it is not one. */
export function parseServerDraft(body: unknown): McpServerDraft | null {
  if (!body || typeof body !== "object") return null;
  const { name, url, auth, token } = body as Record<string, unknown>;
  if (typeof name !== "string" || !name.trim() || name.length > 60) return null;
  if (typeof url !== "string" || !url.trim() || url.length > 2000) return null;
  if (auth !== "none" && auth !== "bearer") return null;
  const draft: McpServerDraft = { name: name.trim(), url: url.trim(), auth };
  if (auth === "none") return token === undefined || token === "" ? draft : null;
  if (typeof token !== "string" || !token.trim() || token.length > 4200) return null;
  return { ...draft, token: token.trim() };
}

const SERVER_ID = /^\d{1,12}$/;
export const isServerId = (id: unknown): id is string => typeof id === "string" && SERVER_ID.test(id);

/** The back office's path to add a server to a scope; null for a member id that is not one. */
export const mcpScopePath = (scope: SettingScope): string | null => scopePath("/app/mcp", scope);

/** The back office's path of one server of a scope; null when either id is not a plain number. */
export function mcpServerPath(scope: SettingScope, serverId: unknown): string | null {
  const base = mcpScopePath(scope);
  return base && isServerId(serverId) ? `${base}/${serverId}` : null;
}

const REFUSALS: Record<string, string> = {
  bad_name: "Ce nom n’est pas valide : une lettre minuscule, puis des minuscules, des chiffres ou « _ », 40 caractères au plus, sans espace ni tiret.",
  reserved_name: "Ce nom est réservé. Choisissez-en un autre.",
  duplicate_name: "Un serveur porte déjà ce nom. Choisissez-en un autre, ou supprimez d’abord l’ancien.",
  bad_url: "Cette adresse n’est pas acceptée : elle doit commencer par https:// et être joignable depuis Internet.",
  bad_token: "Ce jeton n’est pas valide. Vérifiez qu’il est copié en entier, sans espace ni retour à la ligne.",
  too_many_servers: "Vous avez atteint le nombre maximal de serveurs (10). Supprimez-en un pour en ajouter un autre.",
  bad_request: "Cette demande n’a pas pu être traitée.",
  forbidden: "Ce réglage est réservé aux administrateurs de votre espace.",
  not_found: "Ce serveur est introuvable.",
  too_many_attempts: "Trop d’essais en peu de temps. Réessayez dans une heure.",
  unavailable: "L’enregistrement est momentanément indisponible. Réessayez plus tard.",
};

/**
 * The sentence for one of the back office's refusal codes, or null for a code that is not one of
 * these (the caller then answers its usual sentence). The back office's own text is never shown.
 */
export function mcpRefusalMessage(code: string): string | null {
  return Object.hasOwn(REFUSALS, code) ? REFUSALS[code] : null;
}

export const MCP_STATE_LABELS: Record<McpState, string> = {
  applied: "En service",
  pending: "Installation en cours",
  failed: "Installation en échec",
};

/** True while the back office is still writing a server somewhere the caller can see. */
export function mcpPending(o: McpOverview): boolean {
  return [...o.own, ...(o.client ?? []), ...(o.members ?? []).flatMap((m) => m.servers)].some((s) => s.state === "pending");
}
