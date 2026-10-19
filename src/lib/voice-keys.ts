// The client's own transcription keys (Intégrations › Voix), as the app sees them. The back office
// keeps them encrypted, checks them with the provider and never puts them on an instance; they serve
// dictation and voice notes, never voice calls. Contract: yelema-platform docs/specs/client-api-v1, `/app/voice/keys`.

import { scopePath, type SettingScope } from "./llm.ts";

export interface VoiceKey {
  provider: string;
  /** Its last four characters: the key itself never comes back. */
  hint: string;
  verified: boolean;
  updatedAt: string | null;
}

export interface VoiceKeysOverview {
  providers: { id: string; label: string; placeholder: string }[];
  own: VoiceKey[];
  /** Admins only. */
  client?: VoiceKey[];
  members?: { id: string; name: string | null; email: string; keys: VoiceKey[] }[];
}

const PROVIDER = /^[a-z]{2,20}$/;

/** The back office's path for a scope's key, or for one provider's key in it; null when an id is not one. */
export function voiceKeyPath(scope: SettingScope, provider?: string): string | null {
  const base = scopePath("/app/voice/keys", scope);
  if (!base || (provider !== undefined && !PROVIDER.test(provider))) return null;
  return provider ? `${base}/${provider}` : base;
}

/** `/api/voice/keys/<segments>` → the scope (and provider) it names; null for anything else. */
export function parseVoiceKeyRoute(segments: readonly string[]): { scope: SettingScope; provider?: string } | null {
  const [head, ...rest] = segments;
  const tail = (scope: SettingScope, more: readonly string[]) => (more.length === 0 ? { scope } : more.length === 1 && PROVIDER.test(more[0]!) ? { scope, provider: more[0] } : null);
  if (head === "client" || head === "own") return tail({ kind: head }, rest);
  if (head === "members" && rest[0] && /^\d{1,12}$/.test(rest[0])) return tail({ kind: "member", id: rest[0] }, rest.slice(1));
  return null;
}

/** A key draft from a request body: its two fields, bounded; null when it is not one. */
export function parseVoiceKeyDraft(body: unknown): { provider: string; secret: string } | null {
  const { provider, secret } = (body ?? {}) as Record<string, unknown>;
  return typeof provider === "string" && PROVIDER.test(provider) && typeof secret === "string" && secret.trim() && secret.length <= 300 ? { provider, secret: secret.trim() } : null;
}

const REFUSALS: Record<string, string> = {
  bad_provider: "Ce fournisseur n’est pas proposé.",
  bad_secret: "Cette clé n’a pas la forme attendue pour ce fournisseur. Vérifiez qu’elle est copiée en entier.",
  refused_key: "Le fournisseur refuse cette clé. Vérifiez-la, ou créez-en une nouvelle.",
  forbidden: "Ce réglage est réservé aux administrateurs de votre espace.",
  not_found: "Cette clé est introuvable.",
  too_many_attempts: "Trop d’essais en peu de temps. Réessayez dans une heure.",
  unavailable: "L’enregistrement est momentanément indisponible. Réessayez plus tard.",
  bad_request: "Cette demande n’a pas pu être traitée.",
};

export const voiceKeyRefusal = (code: string): string | null => (Object.hasOwn(REFUSALS, code) ? REFUSALS[code] : null);
