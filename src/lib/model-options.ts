// The models a picker offers, grouped by provider, as `GET /app/llm/models` serves them. Pure
// helpers: filtering, labels, a fallback when the list cannot be read, and the edits of block 2.

import { isRecord, moveItem, recordsOf, type LlmGroup, type ModelChoice, type ProfileModels } from "./llm-accounts.ts";

export interface ModelOption {
  id: string;
  label: string;
}

export interface ModelGroup {
  /** Hermes provider id: what a choice sends back. */
  provider: string;
  label: string;
  source: "account" | "yelema" | "recommended";
  models: ModelOption[];
}

const PROVIDER = /^(custom:[A-Za-z][A-Za-z0-9_-]{1,39}|[a-z0-9][a-z0-9-]{0,63})$/;
export const isProviderParam = (v: string | null): v is string => v !== null && PROVIDER.test(v);

const SOURCES: readonly ModelGroup["source"][] = ["account", "yelema", "recommended"];

/** `GET /api/llm/models` kept to what a picker renders; null when it is no list. */
export function readModelGroups(v: unknown): ModelGroup[] | null {
  if (!isRecord(v) || !Array.isArray(v.groups)) return null;
  return recordsOf(v.groups, (g) =>
    typeof g.provider === "string" && typeof g.label === "string"
      ? {
          provider: g.provider, label: g.label, source: SOURCES.includes(g.source as ModelGroup["source"]) ? (g.source as ModelGroup["source"]) : "recommended",
          models: recordsOf(g.models, (m) => (typeof m.id === "string" ? { id: m.id, label: typeof m.label === "string" ? m.label : m.id } : null)),
        }
      : null,
  );
}

/** Groups keeping only the models whose label or id contains `query`; empty groups drop out. */
export function filterModelGroups(groups: readonly ModelGroup[], query: string): ModelGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...groups];
  return groups
    .map((g) => ({ ...g, models: g.models.filter((m) => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || g.label.toLowerCase().includes(q)) }))
    .filter((g) => g.models.length > 0);
}

/** « Claude Opus 5.5 (Anthropic) » for a choice, its bare id when the list does not know it. */
export function choiceLabel(groups: readonly ModelGroup[], choice: ModelChoice): string {
  const group = groups.find((g) => g.provider === choice.provider);
  const model = group?.models.find((m) => m.id === choice.model);
  return model && group ? `${model.label} (${group.label})` : choice.model;
}

/** What the accounts already name (model + backups), plus Yelema's list: when the server list is out of reach. */
export function fallbackModelGroups(groups: readonly LlmGroup[], name: (g: LlmGroup) => string, yelema?: { provider: string; models: ModelOption[] } | null): ModelGroup[] {
  const out: ModelGroup[] = groups.map((g) => ({ provider: g.provider, label: name(g), source: "account", models: [g.model, ...g.fallbacks].map((id) => ({ id, label: id })) }));
  if (yelema?.models.length) out.push({ provider: yelema.provider, label: "Moteur Yelema", source: "yelema", models: yelema.models });
  return out;
}

/** The map to send after one expert's pick: the whole map, the reset kept as null. */
export const profilesWith = (current: ProfileModels | undefined, profile: string, choice: ModelChoice | null): ProfileModels => ({ ...current, [profile]: choice });

/** True when at least one expert runs on its own model. */
export const anyExpertOverride = (profiles: ProfileModels | undefined, known: readonly string[]): boolean => known.some((p) => profiles?.[p]);

/** « Every expert » on `choice`: the principal's model when it is the principal's provider, else that provider becomes principal. */
export function withAllExperts(groups: readonly LlmGroup[], choice: ModelChoice): LlmGroup[] | null {
  const i = groups.findIndex((g) => g.provider === choice.provider);
  if (i < 0) return null;
  const set = groups.map((g, k) => (k === i ? { ...g, model: choice.model, fallbacks: g.fallbacks.filter((m) => m !== choice.model) } : g));
  return moveItem(set, i, 0);
}

export interface ExpertRow {
  profileId: string;
  displayName: string;
}

const expertKey = (profile: string): string => (profile.includes("__") ? profile.slice(profile.lastIndexOf("__") + 2) : profile);

/**
 * The experts block 2 lists. The caller's own instance: their experts. A member's: the profiles the back
 * office says are installed there, named like the caller's when they match; none when it does not say.
 */
export function expertRows(scope: "own" | "member", mine: readonly ExpertRow[], installed?: readonly string[]): ExpertRow[] {
  if (scope === "own") return mine.map(({ profileId, displayName }) => ({ profileId, displayName }));
  return (installed ?? []).map((p) => ({ profileId: p, displayName: mine.find((x) => expertKey(x.profileId) === expertKey(p))?.displayName ?? expertKey(p) }));
}
