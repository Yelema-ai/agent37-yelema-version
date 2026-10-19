import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { MessagingPlatform } from "./channels.ts";
import { summarize } from "./recommendations.ts";
import type { IntegrationConnection } from "./types.ts";

const channel = (id: string, name: string, connected: boolean): MessagingPlatform => ({ id, name, enabled: connected, state: connected ? "connected" : "disabled" }) as unknown as MessagingPlatform;
const REPORT = {
  at: "2026-10-19T18:00:00.000Z",
  servers: [
    { name: "notion", managed: false, state: "ok" as const, tools: [{ name: "search", description: "" }, { name: "fetch", description: "" }] },
    { name: "crm", managed: false, state: "failed" as const, tools: [] },
    { name: "memoire", managed: true, state: "failed" as const, tools: [] },
  ],
};

describe("summarize", () => {
  it("compte les outils des serveurs branchés ; recommande d'autoriser, de vérifier un serveur du client, un canal et des connecteurs", () => {
    const s = summarize({ report: REPORT, oauth: [{ id: "1", name: "linear", connected: false, pending: false }], channels: [channel("telegram", "Telegram", false), channel("whatsapp", "WhatsApp", false), channel("irc", "IRC", false)], connections: [] });
    assert.equal(s.tools, 2);
    assert.equal(s.servers, 1);
    assert.deepEqual(s.todo.map((t) => t.key), ["oauth:linear", "failed:crm", "channels", "connectors"]);
    assert.match(s.todo[2]!.detail, /Telegram, WhatsApp\./);
  });

  it("rien à recommander quand tout est branché ; les connecteurs sont nommés une fois", () => {
    const c = (slug: string, status = "ACTIVE") => ({ id: slug + status, status, toolkitSlug: slug, toolkitName: slug.toUpperCase() }) as IntegrationConnection;
    const s = summarize({ report: { ...REPORT, servers: [REPORT.servers[0]!] }, oauth: [{ id: "1", name: "linear", connected: true, pending: false }], channels: [channel("telegram", "Telegram", true)], connections: [c("gmail"), c("gmail"), c("drive", "EXPIRED")] });
    assert.deepEqual(s.todo, []);
    assert.deepEqual(s.connectors, ["GMAIL"]);
    assert.deepEqual(s.channels, ["Telegram"]);
  });

  it("sans relevé : zéro outil, et les mêmes recommandations sur le reste", () => {
    const s = summarize({ report: null, oauth: [], channels: [], connections: [] });
    assert.deepEqual([s.tools, s.servers], [0, 0]);
    assert.deepEqual(s.todo.map((t) => t.key), ["connectors"]);
  });
});
