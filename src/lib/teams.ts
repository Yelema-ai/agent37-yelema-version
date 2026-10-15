import "server-only";
import { ApiError } from "@/lib/http";

// Microsoft Teams: before the credentials go into the agent, ask Microsoft Entra for the token the bot
// itself will ask for (single-tenant bot, client credentials, Bot Framework scope). A wrong id or
// secret is caught here instead of by the agent's gateway, which would stop every channel with it.
// https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-authentication
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TeamsCredentials {
  clientId: string;
  clientSecret: string;
  tenantId: string;
}

export async function checkTeamsCredentials({ clientId, clientSecret, tenantId }: TeamsCredentials): Promise<void> {
  if (!GUID.test(clientId)) throw new ApiError(400, "invalid_request", "L’ID d’application ne convient pas : il a la forme 8-4-4-4-12 (Azure Bot › Configuration).");
  if (!GUID.test(tenantId)) throw new ApiError(400, "invalid_request", "L’ID de l’annuaire ne convient pas : il a la forme 8-4-4-4-12 (Azure Bot › Configuration).");
  let res: Response;
  try {
    res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "https://api.botframework.com/.default" }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(502, "teams_unreachable", "Microsoft ne répond pas. Réessayez.");
  }
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
  console.error("[channels] teams token refused:", res.status, body.error, body.error_description?.split("\r\n")[0]);
  const code = /AADSTS(\d+)/.exec(body.error_description ?? "")?.[1];
  if (code === "7000215" || code === "7000222") throw new ApiError(400, "invalid_credentials", "Microsoft refuse ce secret : copiez de nouveau sa valeur (pas son ID), ou créez-en un autre.");
  if (code === "700016") throw new ApiError(400, "invalid_credentials", "Microsoft ne trouve pas cette application dans cet annuaire : vérifiez l’ID d’application et l’ID de l’annuaire.");
  if (code === "90002" || code === "900023") throw new ApiError(400, "invalid_credentials", "Microsoft ne trouve pas cet annuaire : vérifiez l’ID de l’annuaire.");
  throw new ApiError(400, "invalid_credentials", "Microsoft refuse ces identifiants : vérifiez l’ID d’application, le secret et l’ID de l’annuaire.");
}
