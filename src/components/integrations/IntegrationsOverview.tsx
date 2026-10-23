"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Server } from "lucide-react";
import { channelBrand } from "@/components/channels/BrandIcons";
import { apiFetch } from "@/lib/api";
import type { ChannelsResponse } from "@/lib/channels";
import type { McpOauthServer, McpToolsOverview } from "@/lib/mcp-servers";
import { overview, summarize, type OverviewItem } from "@/lib/recommendations";
import type { IntegrationConnectionsResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ToolLogo } from "./ToolLogo";

// Intégrations · Aperçu : ce qui est branché sur les experts de la personne connectée, en trois cartes
// (MCP, connecteurs, canaux) avec les logos de ce qui marche et ce qui reste à régler. Pas de liste de
// recommandations dessous (Leslie, 20/10) : la carte dit « 2 à régler » et mène à l'onglet où le faire.
// Une source qui ne répond pas compte pour vide, sans faire tomber l'aperçu.

/** Le logo d'une intégration : celui du connecteur, la marque du canal, l'initiale d'un serveur MCP. */
function ItemLogo({ item }: { item: Pick<OverviewItem, "name" | "logo" | "channel"> }) {
  const box = "h-8 w-8 rounded-full ring-2 ring-surface";
  if (item.logo) return <ToolLogo logo={item.logo} name={item.name} className={cn(box, "border border-line bg-surface")} imgClassName="h-[18px] w-[18px]" />;
  if (item.channel) {
    const { Icon, color } = channelBrand(item.channel);
    return (
      <span className={cn("grid shrink-0 place-items-center border border-line bg-surface", box)}>
        <Icon className="h-4 w-4" {...(color ? { style: { color } } : {})} />
      </span>
    );
  }
  return <span className={cn("grid shrink-0 place-items-center bg-tint font-display text-[12px] font-bold uppercase text-brand-ink", box)}>{item.name.charAt(0)}</span>;
}

function Stack({ items, max = 4 }: { items: OverviewItem[]; max?: number }) {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((i, n) => (
        <span key={i.key} className={n ? "-ml-2" : undefined} title={i.name}>
          <ItemLogo item={i} />
        </span>
      ))}
      {more > 0 && (
        <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full bg-soft-2 px-1.5 text-[12px] font-bold text-ink-2 ring-2 ring-surface">+{more}</span>
      )}
    </span>
  );
}

/** MCP servers have no logo of their own: each by its name, in a pill (an initial alone reads as nothing). */
function Pills({ items, max = 3 }: { items: OverviewItem[]; max?: number }) {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1.5">
      {shown.map((i) => (
        <span key={i.key} className="inline-flex h-8 max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12.5px] font-semibold text-ink-2">
          <Server className="size-3.5 shrink-0 text-brand" />
          <span className="truncate">{i.name}</span>
        </span>
      ))}
      {more > 0 && <span className="inline-flex h-8 items-center rounded-full bg-soft-2 px-2.5 text-[12px] font-bold text-ink-2">+{more}</span>}
    </span>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function IntegrationsOverview({ agentId }: { agentId: string }) {
  const [input, setInput] = useState<Parameters<typeof summarize>[0] | null>(null);
  const summary = useMemo(() => (input ? summarize(input) : null), [input]);
  const sections = useMemo(() => (input ? overview(input) : null), [input]);

  useEffect(() => {
    let alive = true;
    const soft = <T,>(p: Promise<T>, empty: T) => p.catch(() => empty);
    void Promise.all([
      soft(apiFetch<McpToolsOverview>("/api/mcp/tools"), { own: null }),
      soft(apiFetch<{ servers: McpOauthServer[] }>("/api/mcp/oauth"), { servers: [] }),
      soft(apiFetch<ChannelsResponse>(`/api/agents/${agentId}/channels`), { channels: [], teams_endpoint: null }),
      soft(apiFetch<IntegrationConnectionsResult>(`/api/agents/${agentId}/integrations/connections`), { connections: [] }),
    ]).then(([tools, oauth, channels, connections]) => {
      if (alive) setInput({ report: tools.own, oauth: oauth.servers, channels: channels.channels, connections: connections.connections });
    });
    return () => {
      alive = false;
    };
  }, [agentId]);

  if (!summary || !sections)
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-[22px] border border-line bg-surface">
        <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
      </div>
    );

  const active = (list: OverviewItem[]) => list.filter((i) => i.state === "active");
  const cards = [
    { key: "mcp", label: "Outils MCP", value: summary.tools, note: plural(summary.servers, "serveur", "serveurs"), items: sections.servers, href: "/integrations/mcp" },
    { key: "connectors", label: "Connecteurs", value: active(sections.connectors).length, note: null, items: sections.connectors, href: "/integrations/connecteurs" },
    { key: "channels", label: "Canaux", value: active(sections.channels).length, note: null, items: sections.channels, href: "/integrations/canaux" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Aperçu</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const waiting = c.items.filter((i) => i.state !== "active").length;
          const on = active(c.items);
          return (
            <Link key={c.key} href={c.href} className="flex flex-col rounded-[22px] border border-line bg-surface p-4 transition-colors hover:border-brand/40">
              <span className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">{c.label}</span>
                {(on.length > 0 || waiting > 0) && (
                  <span className={cn("inline-flex items-center gap-1.5 text-[12px] font-semibold", waiting ? "text-coral-ink" : "text-ok")}>
                    <span className={cn("size-2 rounded-full", waiting ? "bg-coral" : "bg-ok")} aria-hidden />
                    {waiting ? `${waiting} à régler` : "Actif"}
                  </span>
                )}
              </span>
              <span className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-[28px] font-bold text-ink">{c.value}</span>
                {c.note && <span className="text-xs text-ink-3">{c.note}</span>}
              </span>
              <span className="mt-auto pt-3 sm:min-h-[52px]">{on.length ? c.key === "mcp" ? <Pills items={on} /> : <Stack items={on} /> : <span className="text-[13px] text-ink-3">Aucun</span>}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
