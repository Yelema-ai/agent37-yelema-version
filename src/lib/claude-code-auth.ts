// Le modèle d'une instance Claude Code : l'abonnement Claude du membre ou une clé API Anthropic, tous deux
// gardés sur l'instance. Types du contrat `/app/claude-code/auth` et ce qu'on montre au membre.

export type ClaudeAuth = { loggedIn: boolean; method: string; email: string | null; plan: string | null };
export type ClaudeLogin = { state: "waiting_code" | "checking" | "done" | "failed" | "expired" | "cancelled"; url?: string; expiresAt?: string | null; reason?: string };
export type ClaudeAuthStatus = { auth: ClaudeAuth; key: boolean; login: ClaudeLogin | null };
/** Réponse de la route de l'app pour une instance qui n'est pas sous Claude Code. */
export type ClaudeAuthView = ClaudeAuthStatus | { unsupported: true };

export const CLAUDE_CODE_RE = /^[A-Za-z0-9_#.-]{10,512}$/;
const LOGIN_HOSTS = new Set(["claude.com", "claude.ai", "platform.claude.com", "console.anthropic.com"]);

/** L'adresse de connexion, seulement si elle mène chez Anthropic. */
export function safeLoginUrl(v: unknown): string | null {
  try {
    const u = new URL(String(v));
    return u.protocol === "https:" && LOGIN_HOSTS.has(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

const PLANS: Record<string, string> = { pro: "Claude Pro", max: "Claude Max", team: "Claude Team", enterprise: "Claude Enterprise" };

/** Ce qui sert l'instance, en une phrase. La clé passe devant l'abonnement. */
export function describeClaudeAuth(s: ClaudeAuthStatus): string {
  if (s.key) return "Clé API Anthropic";
  if (s.auth.loggedIn && s.auth.method === "claude.ai") return `${(s.auth.plan && PLANS[s.auth.plan]) || "Abonnement Claude"}${s.auth.email ? ` · ${s.auth.email}` : ""}`;
  if (s.auth.loggedIn) return "Compte Anthropic connecté";
  return "Aucun modèle connecté";
}

const REFUSALS: Record<string, string> = {
  not_claude_code: "Cette instance ne tourne pas sous Claude Code.",
  image_outdated: "Mettez l’instance à jour pour connecter son modèle depuis l’app.",
  login_unavailable: "La connexion n’a pas pu démarrer sur l’instance. Réessayez dans un instant.",
  instance_error: "L’instance n’a pas pu traiter la demande. Réessayez dans un instant.",
  bad_secret_format: "Cette clé n’a pas la forme d’une clé API Anthropic (sk-ant-api…).",
  secret_refused: "Anthropic refuse cette clé.",
};
export const claudeAuthRefusal = (code: string): string | null => (Object.hasOwn(REFUSALS, code) ? REFUSALS[code]! : null);

export const LOGIN_FAILURES: Record<string, string> = {
  bad_code: "Ce code n’a pas la bonne forme : copiez-le en entier depuis la page de Claude.",
  code_refused: "Claude a refusé ce code (expiré ou déjà utilisé). Relancez la connexion.",
  no_login: "La connexion a expiré. Relancez-la.",
  login_failed: "La connexion n’a pas abouti. Relancez-la.",
};
