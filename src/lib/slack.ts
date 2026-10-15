import "server-only";
import { ApiError } from "@/lib/http";

// Slack, checked before anything is written: `auth.test` proves the bot token (xoxb-) and
// `apps.connections.open` the app-level token (xapp-, scope connections:write) that Socket Mode uses.
// Opening a connection URL and not using it costs nothing.
// https://api.slack.com/methods/auth.test · https://api.slack.com/methods/apps.connections.open
async function call(method: string, token: string): Promise<{ ok?: boolean; error?: string; team?: string }> {
  try {
    const res = await fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    return (await res.json()) as { ok?: boolean; error?: string; team?: string };
  } catch {
    throw new ApiError(502, "slack_unreachable", "Slack ne répond pas. Réessayez.");
  }
}

export async function checkSlackBotToken(token: string): Promise<void> {
  if (!/^xoxb-[A-Za-z0-9-]{20,}$/.test(token)) throw new ApiError(400, "invalid_request", "Le jeton du bot commence par xoxb- (OAuth & Permissions › Bot User OAuth Token).");
  const r = await call("auth.test", token);
  if (!r.ok) {
    console.error("[channels] slack auth.test:", r.error);
    throw new ApiError(400, "invalid_credentials", "Slack refuse le jeton du bot : réinstallez l’application dans votre espace puis copiez-le de nouveau.");
  }
}

export async function checkSlackAppToken(token: string): Promise<void> {
  if (!/^xapp-[A-Za-z0-9-]{20,}$/.test(token)) throw new ApiError(400, "invalid_request", "Le jeton de l’application commence par xapp- (Basic Information › App-Level Tokens).");
  const r = await call("apps.connections.open", token);
  if (!r.ok) {
    console.error("[channels] slack apps.connections.open:", r.error);
    throw new ApiError(400, "invalid_credentials", r.error === "missing_scope"
      ? "Ce jeton d’application n’a pas le droit connections:write : créez-en un avec ce droit."
      : "Slack refuse le jeton de l’application. Vérifiez que le Socket Mode est activé, puis copiez-le de nouveau.");
  }
}
