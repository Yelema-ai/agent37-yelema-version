import "server-only";
import { ApiError } from "@/lib/http";

// Discord: the bot token is checked against `GET /users/@me` before it goes into the agent.
// https://discord.com/developers/docs/resources/user#get-current-user
export async function checkDiscordBotToken(token: string): Promise<void> {
  if (!/^[A-Za-z0-9_.-]{50,100}$/.test(token)) throw new ApiError(400, "invalid_request", "Ce n’est pas un jeton de bot Discord (Bot › Reset Token, dans le portail développeur).");
  let res: Response;
  try {
    res = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bot ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(502, "discord_unreachable", "Discord ne répond pas. Réessayez.");
  }
  if (res.ok) return;
  console.error("[channels] discord users/@me:", res.status);
  throw new ApiError(400, "invalid_credentials", "Discord refuse ce jeton : générez-en un nouveau (Bot › Reset Token) et copiez-le.");
}
