// Backup model accounts, as the app sees them: several accounts per provider, grouped by provider in
// the order the instance tries them, each provider with its model and backup models. The back office
// owns the accounts and installs them; this module shapes what goes to it and computes a new order
// after a drag. Contract: yelema-platform docs/specs/client-api-v1/openapi.yaml, `/app/llm/accounts`.

import type { SettingScope } from "./llm.ts";

export type LlmAccountState = "active" | "pending" | "failed" | "refused";

export interface LlmAccount {
  id: string;
  /** Catalogue id, sign-in provider id, or `custom`. */
  provider: string;
  label: string;
  /** End of the key; empty for a sign-in. The key never comes back. */
  hint: string;
  verified: boolean;
  state: LlmAccountState;
  /** A sign-in waiting for approval: the page to open and the code to type there. */
  login?: { verificationUrl: string; userCode: string; expiresAt: string };
  name?: string;
  baseUrl?: string;
}

export interface LlmGroup {
  /** Hermes provider (`anthropic`, `gemini`, `openai-codex`, `custom:<name>`): what the layout sends back. */
  provider: string;
  model: string;
  fallbacks: string[];
  accounts: LlmAccount[];
}

export interface LlmSetup {
  groups: LlmGroup[];
  state: "applied" | "pending" | "failed";
}

export interface AccountDraft {
  provider: string;
  secret?: string;
  model?: string;
  label?: string;
  name?: string;
  baseUrl?: string;
}

export interface LayoutDraft {
  groups: { provider: string; model: string; fallbacks: string[]; accounts: string[] }[];
}

const PROVIDER_ID = /^[a-z0-9][a-z0-9-]{0,63}$/;
const HERMES_PROVIDER = /^(custom:[A-Za-z][A-Za-z0-9_-]{1,39}|[a-z0-9][a-z0-9-]{0,63})$/;
const MODEL = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,120}$/;
const ACCOUNT_ID = /^\d{1,12}$/;
export const MAX_FALLBACKS = 5;

export const isAccountId = (v: unknown): v is string => typeof v === "string" && ACCOUNT_ID.test(v);

/** `?scope=` of the back office: `own`, `client`, or a member id. Null for anything else. */
export function scopeParam(scope: SettingScope): string | null {
  if (scope.kind === "member") return ACCOUNT_ID.test(scope.id) ? scope.id : null;
  return scope.kind;
}

export function parseScopeParam(value: string | null): SettingScope | null {
  if (value === null || value === "own") return { kind: "own" };
  if (value === "client") return { kind: "client" };
  return ACCOUNT_ID.test(value) ? { kind: "member", id: value } : null;
}

// Loose bounds only: the back office holds the real rules. These keep a mistyped or oversized body
// from travelling at all.

const text = (v: unknown, max: number): string | undefined => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : undefined);

export function parseAccountDraft(body: unknown): AccountDraft | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.provider !== "string" || !PROVIDER_ID.test(b.provider)) return null;
  if (b.secret !== undefined && (typeof b.secret !== "string" || b.secret.length > 4200)) return null;
  if (b.model !== undefined && b.model !== "" && (typeof b.model !== "string" || !MODEL.test(b.model.trim()))) return null;
  const draft: AccountDraft = { provider: b.provider };
  for (const [k, max] of [["secret", 4200], ["model", 121], ["label", 60], ["name", 60], ["baseUrl", 2000]] as const) {
    const v = text(b[k], max);
    if (v) draft[k] = v;
  }
  return draft;
}

export function parseAccountPatch(body: unknown): { label?: string; secret?: string } | null {
  if (!body || typeof body !== "object") return null;
  const { label, secret } = body as Record<string, unknown>;
  if (label !== undefined && (typeof label !== "string" || label.length > 60)) return null;
  if (secret !== undefined && (typeof secret !== "string" || !secret.trim() || secret.length > 4200)) return null;
  if (label === undefined && secret === undefined) return null;
  return { ...(typeof label === "string" ? { label: label.trim() } : {}), ...(typeof secret === "string" ? { secret: secret.trim() } : {}) };
}

export function parseLayout(body: unknown): LayoutDraft | null {
  const groups = (body as { groups?: unknown } | null)?.groups;
  if (!Array.isArray(groups) || groups.length === 0 || groups.length > 20) return null;
  const out: LayoutDraft["groups"] = [];
  for (const g of groups as Record<string, unknown>[]) {
    if (typeof g?.provider !== "string" || !HERMES_PROVIDER.test(g.provider) || typeof g.model !== "string" || !MODEL.test(g.model)) return null;
    const fallbacks = Array.isArray(g.fallbacks) ? g.fallbacks : [];
    const accounts = Array.isArray(g.accounts) ? g.accounts : [];
    if (fallbacks.length > MAX_FALLBACKS || !fallbacks.every((m) => typeof m === "string" && MODEL.test(m))) return null;
    if (!accounts.length || accounts.length > 20 || !accounts.every(isAccountId)) return null;
    out.push({ provider: g.provider, model: g.model, fallbacks: fallbacks as string[], accounts: accounts as string[] });
  }
  return { groups: out };
}

/** The layout to send for groups as shown. */
export const layoutOf = (groups: readonly LlmGroup[]): LayoutDraft => ({
  groups: groups.map((g) => ({ provider: g.provider, model: g.model, fallbacks: g.fallbacks, accounts: g.accounts.map((a) => a.id) })),
});

/** `list` with the item at `from` moved to `to` (indices in the original list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** A model typed by hand: what the back office accepts, or null. */
export const cleanModel = (v: string): string | null => (MODEL.test(v.trim()) ? v.trim() : null);

export const ACCOUNT_REFUSALS: Record<string, string> = {
  too_many_accounts: "Vous avez atteint le nombre maximum de comptes (20).",
  login_needs_instance: "Une connexion se fait pour une instance : ajoutez-la à un membre plutôt qu’à toute l’entreprise.",
  bad_layout: "Cet ordre n’a pas pu être enregistré. Rechargez la page et recommencez.",
};

export const ACCOUNT_STATE_LABELS: Record<LlmAccountState, string> = {
  active: "Actif",
  pending: "En attente de connexion",
  failed: "Connexion échouée",
  refused: "Refusé par le fournisseur",
};
