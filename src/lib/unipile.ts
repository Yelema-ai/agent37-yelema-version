// Messagerie Unipile (WhatsApp…) de sa propre instance : le DSN et la clé saisis ici partent au
// back-office, qui les pose sur l'instance sans les garder. Pur : `node --test` le lit tel quel.

export interface UnipileAccount {
  id: string;
  type: string;
  name: string;
  status: string | null;
}

export interface UnipileStatus {
  connected: boolean;
  accounts: UnipileAccount[];
  accountsError: string | null;
  experts: string[];
  available: string[];
}

export interface UnipileDraft {
  dsn: string;
  apiKey: string;
  experts: string[];
}

const DSN_RE = /^[a-z0-9-]{1,40}\.unipile\.com(:\d{2,5})?$/;
const KEY_RE = /^[A-Za-z0-9._~+/=-]{16,512}$/;
const PROFILE_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;

/** « https://api8.unipile.com:13851/ » → « api8.unipile.com:13851 » ; null hors *.unipile.com. */
export function normalizeDsn(value: string): string | null {
  const v = value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return DSN_RE.test(v) ? v : null;
}

export function parseUnipileDraft(body: unknown): UnipileDraft | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const dsn = typeof o.dsn === "string" ? normalizeDsn(o.dsn) : null;
  const apiKey = typeof o.apiKey === "string" ? o.apiKey.trim() : "";
  const experts = Array.isArray(o.experts) ? [...new Set(o.experts.filter((p): p is string => typeof p === "string" && PROFILE_RE.test(p)))].slice(0, 50) : [];
  return dsn && KEY_RE.test(apiKey) && experts.length ? { dsn, apiKey, experts } : null;
}

const MESSAGES: Record<string, string> = {
  bad_dsn: "Ce DSN n’est pas une adresse Unipile (exemple : api8.unipile.com:13851).",
  bad_key: "Cette clé d’API Unipile n’a pas le bon format.",
  bad_experts: "Choisissez au moins un Expert.",
  unipile_key_refused: "Unipile refuse cette clé ou ce DSN : vérifiez-les dans votre tableau de bord Unipile.",
  unipile_forbidden: "Unipile refuse l’accès avec cette clé.",
  unipile_unreachable: "Unipile ne répond pas à cette adresse. Vérifiez le DSN.",
  unipile_unavailable: "La messagerie n’est pas encore disponible sur votre instance : elle arrive avec sa prochaine mise à jour.",
  instance_error: "Votre instance n’a pas pu traiter la demande. Réessayez dans un instant.",
};

export const unipileRefusalMessage = (code: string): string | null => MESSAGES[code] ?? null;
