import { isChannelConnected, type MessagingPlatform } from "./channels.ts";
import { isConnectionActive } from "./expert-tools.ts";
import type { McpOauthServer, McpToolsReport } from "./mcp-servers.ts";
import type { IntegrationConnection } from "./types.ts";

// L'aperçu des intégrations d'un membre : ce qui est branché sur ses experts, et ce qu'il lui reste
// à faire pour qu'ils en aient plus. Calculé ici, sur ce que l'app lit déjà (relevé MCP du back-office,
// canaux et connecteurs de l'instance) ; rien n'est appelé de plus.

export type Recommendation = { key: string; title: string; detail: string; href: string };
export type IntegrationsSummary = { tools: number; servers: number; connectors: string[]; channels: string[]; todo: Recommendation[] };

/** Les canaux qu'on propose d'abord quand aucun n'est branché. */
const SUGGESTED_CHANNELS = ["telegram", "whatsapp", "teams", "slack"];

export function summarize(input: { report: McpToolsReport | null; oauth: McpOauthServer[]; channels: MessagingPlatform[]; connections: IntegrationConnection[] }): IntegrationsSummary {
  const ok = (input.report?.servers ?? []).filter((s) => s.state === "ok");
  const todo: Recommendation[] = [];
  for (const s of input.oauth.filter((o) => !o.connected)) todo.push({ key: `oauth:${s.name}`, title: `Autoriser ${s.name}`, detail: "Ce serveur attend que vous vous connectiez chez son fournisseur : ses outils ne servent pas encore.", href: "/integrations/mcp" });
  for (const s of (input.report?.servers ?? []).filter((x) => x.state === "failed" && !x.managed)) todo.push({ key: `failed:${s.name}`, title: `Vérifier ${s.name}`, detail: "Ce serveur ne répondait pas au dernier relevé.", href: "/integrations/mcp" });
  const channels = input.channels.filter(isChannelConnected).map((c) => c.name);
  if (channels.length === 0) {
    const names = input.channels.filter((c) => SUGGESTED_CHANNELS.includes(c.id)).map((c) => c.name);
    if (names.length) todo.push({ key: "channels", title: "Brancher un canal", detail: `Écrivez à vos experts depuis ${names.join(", ")}.`, href: "/integrations/canaux" });
  }
  const connectors = [...new Set(input.connections.filter(isConnectionActive).map((c) => c.toolkitName || c.toolkitSlug || "").filter(Boolean))];
  if (connectors.length === 0) todo.push({ key: "connectors", title: "Connecter vos outils", detail: "Gmail, Drive, Notion… : vos experts travaillent dans vos applications.", href: "/integrations/connecteurs" });
  return { tools: ok.reduce((n, s) => n + s.tools.length, 0), servers: ok.length, connectors, channels, todo };
}
