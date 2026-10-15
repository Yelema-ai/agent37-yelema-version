import "server-only";
import { ApiError } from "@/lib/http";
import type { MessagingPlatform } from "@/lib/channels";
import { checkDiscordBotToken } from "@/lib/discord";
import { checkGoogleChatCredentials } from "@/lib/google-chat";
import { checkSlackAppToken, checkSlackBotToken } from "@/lib/slack";
import { checkTeamsCredentials } from "@/lib/teams";
import { assertBotTokenShape, checkBotToken } from "@/lib/telegram";

// Every new credential is checked with its provider before it is written: the agent's messaging
// gateway refuses to start on a bad one and takes every other channel down with it. A secret already
// on the agent cannot be read back, so a check that needs several values asks for all of them.
export async function checkChannelCredentials(platform: MessagingPlatform, env: Record<string, string>): Promise<void> {
  const current = (key: string): string | null => (key in env ? env[key] : platform.env_vars.find((f) => f.key === key)?.is_set ? "" : null);
  switch (platform.id) {
    case "telegram":
      if (env.TELEGRAM_BOT_TOKEN) await checkBotToken(assertBotTokenShape(env.TELEGRAM_BOT_TOKEN));
      return;
    case "teams": {
      const keys = ["TEAMS_CLIENT_ID", "TEAMS_CLIENT_SECRET", "TEAMS_TENANT_ID"] as const;
      const given = keys.filter((k) => env[k]);
      if (given.length === 0) return;
      if (given.length < keys.length) {
        throw new ApiError(400, "invalid_request", "Pour vérifier la connexion à Microsoft, saisissez ensemble l’ID d’application, le secret et l’ID de l’annuaire.");
      }
      await checkTeamsCredentials({ clientId: env.TEAMS_CLIENT_ID, clientSecret: env.TEAMS_CLIENT_SECRET, tenantId: env.TEAMS_TENANT_ID });
      return;
    }
    case "slack":
      if (env.SLACK_BOT_TOKEN) await checkSlackBotToken(env.SLACK_BOT_TOKEN);
      if (env.SLACK_APP_TOKEN) await checkSlackAppToken(env.SLACK_APP_TOKEN);
      return;
    case "discord":
      if (env.DISCORD_BOT_TOKEN) await checkDiscordBotToken(env.DISCORD_BOT_TOKEN);
      return;
    case "google_chat": {
      const subscription = current("GOOGLE_CHAT_SUBSCRIPTION_NAME");
      if (subscription === null) throw new ApiError(400, "invalid_request", "À renseigner : l’abonnement Pub/Sub (projects/<projet>/subscriptions/<nom>).");
      if (env.GOOGLE_CHAT_SERVICE_ACCOUNT_JSON) {
        await checkGoogleChatCredentials(env.GOOGLE_CHAT_SERVICE_ACCOUNT_JSON, subscription || null, current("GOOGLE_CHAT_PROJECT_ID") || null);
      }
      return;
    }
  }
}
