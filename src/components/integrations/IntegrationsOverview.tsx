"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import type { ChannelsResponse } from "@/lib/channels";
import type { McpOauthServer, McpToolsOverview } from "@/lib/mcp-servers";
import { summarize, type IntegrationsSummary } from "@/lib/recommendations";
import type { IntegrationConnectionsResult } from "@/lib/types";

// Intégrations · Aperçu : ce qui est branché sur les experts de la personne connectée, et ce qu'il
// lui reste à brancher. Une source qui ne répond pas compte pour vide, sans faire tomber l'aperçu.
export function IntegrationsOverview({ agentId }: { agentId: string }) {
  const [summary, setSummary] = useState<IntegrationsSummary | null>(null);

  useEffect(() => {
    let alive = true;
    const soft = <T,>(p: Promise<T>, empty: T) => p.catch(() => empty);
    void Promise.all([
      soft(apiFetch<McpToolsOverview>("/api/mcp/tools"), { own: null }),
      soft(apiFetch<{ servers: McpOauthServer[] }>("/api/mcp/oauth"), { servers: [] }),
      soft(apiFetch<ChannelsResponse>(`/api/agents/${agentId}/channels`), { channels: [], teams_endpoint: null }),
      soft(apiFetch<IntegrationConnectionsResult>(`/api/agents/${agentId}/integrations/connections`), { connections: [] }),
    ]).then(([tools, oauth, channels, connections]) => {
      if (alive) setSummary(summarize({ report: tools.own, oauth: oauth.servers, channels: channels.channels, connections: connections.connections }));
    });
    return () => {
      alive = false;
    };
  }, [agentId]);

  if (!summary)
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-[22px] border border-line bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
      </div>
    );

  const facts = [
    { label: "Outils MCP disponibles", value: String(summary.tools), note: `${summary.servers} serveur${summary.servers > 1 ? "s" : ""}` },
    { label: "Connecteurs", value: String(summary.connectors.length), note: summary.connectors.slice(0, 3).join(", ") || "Aucun" },
    { label: "Canaux", value: String(summary.channels.length), note: summary.channels.join(", ") || "Aucun" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Aperçu</h2>
        <p className="mt-1 max-w-xl text-sm text-ink-3">Ce que vos experts ont sous la main, et ce qui leur manque encore.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {facts.map((f) => (
          <div key={f.label} className="rounded-[22px] border border-line bg-surface p-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">{f.label}</p>
            <p className="mt-1 font-display text-[28px] font-bold text-ink">{f.value}</p>
            <p className="truncate text-xs text-ink-3" title={f.note}>{f.note}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Recommandé</p>
        {summary.todo.length === 0 ? (
          <p className="flex items-center gap-2 rounded-[22px] border border-line bg-surface p-4 text-sm text-ink-2">
            <CheckCircle2 className="h-4 w-4 text-ok" /> Tout est branché. Ajoutez un serveur MCP ou un connecteur quand un besoin apparaît.
          </p>
        ) : (
          summary.todo.map((r) => (
            <Link key={r.key} href={r.href} className="flex items-center gap-3 rounded-[22px] border border-line bg-surface p-4 transition-colors hover:border-brand/40">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{r.title}</p>
                <p className="text-xs text-ink-3">{r.detail}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
