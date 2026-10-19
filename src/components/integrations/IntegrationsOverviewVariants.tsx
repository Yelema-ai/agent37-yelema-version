"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight, Plus, Server } from "lucide-react";
import { channelBrand } from "@/components/channels/BrandIcons";
import { Button } from "@/components/ui/button";
import { DEFAULT_INTEGRATION_TOOLKITS } from "@/lib/integration-catalog";
import type { IntegrationsSummary, OverviewItem, OverviewSections, OverviewState, Recommendation } from "@/lib/recommendations";
import { cn } from "@/lib/utils";
import { ToolLogo } from "./ToolLogo";

// Deux propositions pour l'Aperçu des intégrations, à comparer (?variante=a, ?variante=b) ; sans
// paramètre l'onglet garde la version en service. A : les trois cartes, avec les logos de ce qui est
// branché et le Recommandé en lignes à logo. B : une seule liste par section, une ligne par intégration.

const STATE: Record<OverviewState, { label: string; pill: string; dot: string; action: string | null }> = {
  active: { label: "Actif", pill: "bg-ok-pale text-ok", dot: "bg-ok", action: null },
  to_authorize: { label: "À autoriser", pill: "bg-coral-pale text-coral-ink", dot: "bg-coral", action: "Autoriser" },
  to_check: { label: "À vérifier", pill: "bg-ko-pale text-ko", dot: "bg-ko", action: "Vérifier" },
};

// Ce que la pile de logos montre pour « Connecter vos outils » quand rien n'est branché.
const SUGGESTED = DEFAULT_INTEGRATION_TOOLKITS.filter((t) => ["gmail", "googledrive", "notion"].includes(t.slug));

/** Le logo d'une intégration : celui du connecteur, la marque du canal, l'initiale d'un serveur MCP. */
function ItemLogo({ item, size = "md", ring = false }: { item: Pick<OverviewItem, "name" | "logo" | "channel">; size?: "sm" | "md"; ring?: boolean }) {
  const box = cn(size === "sm" ? "h-8 w-8 rounded-full" : "h-10 w-10 rounded-xl", ring && "ring-2 ring-surface");
  if (item.logo)
    return (
      <ToolLogo
        logo={item.logo}
        name={item.name}
        className={cn(box, "bg-surface border border-line")}
        imgClassName={size === "sm" ? "h-[18px] w-[18px]" : undefined}
      />
    );
  if (item.channel) {
    const { Icon, color } = channelBrand(item.channel);
    return (
      <span className={cn("grid shrink-0 place-items-center border border-line bg-surface", box)}>
        <Icon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} {...(color ? { style: { color } } : {})} />
      </span>
    );
  }
  return (
    <span
      className={cn("grid shrink-0 place-items-center bg-tint font-display font-bold uppercase text-brand-ink", size === "sm" ? "text-[12px]" : "text-sm", box)}
    >
      {item.name.charAt(0)}
    </span>
  );
}

function Stack({ items, max = 4 }: { items: Pick<OverviewItem, "key" | "name" | "logo" | "channel">[]; max?: number }) {
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <span className="flex items-center">
      {shown.map((i, n) => (
        <span key={i.key} className={n ? "-ml-2" : undefined} title={i.name}>
          <ItemLogo item={i} size="sm" ring />
        </span>
      ))}
      {more > 0 && (
        <span className="-ml-2 grid h-8 min-w-8 place-items-center rounded-full bg-soft-2 px-1.5 text-[12px] font-bold text-ink-2 ring-2 ring-surface">
          +{more}
        </span>
      )}
    </span>
  );
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

// ---- A : les cartes ----

export function OverviewCards({ summary, sections }: { summary: IntegrationsSummary; sections: OverviewSections }) {
  const active = (list: OverviewItem[]) => list.filter((i) => i.state === "active");
  const cards = [
    {
      key: "mcp",
      label: "Outils MCP",
      value: summary.tools,
      note: plural(summary.servers, "serveur", "serveurs"),
      items: sections.servers,
      href: "/integrations/mcp",
    },
    {
      key: "connectors",
      label: "Connecteurs",
      value: active(sections.connectors).length,
      note: null,
      items: sections.connectors,
      href: "/integrations/connecteurs",
    },
    { key: "channels", label: "Canaux", value: active(sections.channels).length, note: null, items: sections.channels, href: "/integrations/canaux" },
  ];
  // Le Recommandé de l'aperçu, puis chaque connecteur ou canal qui attend un geste, avec son logo.
  const pending = [...sections.connectors, ...sections.channels].filter((i) => i.state !== "active");
  const todo = summary.todo.length + pending.length;
  return (
    <div className="space-y-6">
      <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Aperçu</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const waiting = c.items.filter((i) => i.state !== "active").length;
          const on = active(c.items);
          return (
            <Link
              key={c.key}
              href={c.href}
              className="flex flex-col rounded-[22px] border border-line bg-surface p-4 transition-colors hover:border-brand/40"
            >
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
              <span className="mt-auto pt-3 sm:min-h-[52px]">{on.length ? <Stack items={on} /> : <span className="text-[13px] text-ink-3">Aucun</span>}</span>
            </Link>
          );
        })}
      </div>
      <div className="space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Recommandé</p>
        {todo === 0 ? (
          <p className="flex items-center gap-2 rounded-[22px] border border-line bg-surface p-4 text-sm text-ink-2">
            <CheckCircle2 className="h-4 w-4 text-ok" /> Tout est branché
          </p>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
            {summary.todo.map((r) => (
              <RecommendedRow key={r.key} r={r} sections={sections} />
            ))}
            {pending.map((i) => (
              <div key={i.key} className="flex min-h-16 items-center gap-3 px-4 py-3">
                <ItemLogo item={i} size="sm" />
                <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{`${STATE[i.state].action} ${i.name}`}</p>
                <Button asChild size="sm" variant="secondary" className="shrink-0 pointer-coarse:h-11 pointer-coarse:px-4">
                  <Link href={i.href}>{STATE[i.state].action}</Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendedRow({ r, sections }: { r: Recommendation; sections: OverviewSections }) {
  const server = r.key.startsWith("oauth:") || r.key.startsWith("failed:") ? r.key.slice(r.key.indexOf(":") + 1) : null;
  const action = r.key.startsWith("oauth:") ? "Autoriser" : r.key.startsWith("failed:") ? "Vérifier" : "Brancher";
  // Un canal à brancher : les marques que l'instance propose ; des connecteurs : trois du catalogue.
  const logos =
    r.key === "channels"
      ? ["telegram", "teams", "slack"].map((id) => ({ key: id, name: id, logo: null, channel: id }))
      : r.key === "connectors"
        ? SUGGESTED.map((t) => ({ key: t.slug, name: t.name, logo: t.logo, channel: null }))
        : null;
  const item = server ? (sections.servers.find((s) => s.name === server) ?? { name: server, logo: null, channel: null }) : null;
  return (
    <div className="flex min-h-16 items-center gap-3 px-4 py-3">
      {logos ? <Stack items={logos} /> : item ? <ItemLogo item={item} size="sm" /> : <Server className="h-5 w-5 text-ink-3" />}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{r.title}</p>
      <Button asChild size="sm" variant={action === "Brancher" ? "default" : "secondary"} className="shrink-0 pointer-coarse:h-11 pointer-coarse:px-4">
        <Link href={r.href}>{action}</Link>
      </Button>
    </div>
  );
}

// ---- B : la liste par section ----

export function OverviewList({ sections }: { sections: OverviewSections }) {
  const groups = [
    { key: "connectors", label: "Connecteurs", items: sections.connectors, href: "/integrations/connecteurs", empty: "Aucun connecteur" },
    { key: "channels", label: "Canaux", items: sections.channels, href: "/integrations/canaux", empty: "Aucun canal" },
    { key: "servers", label: "Serveurs MCP", items: sections.servers, href: "/integrations/mcp", empty: "Aucun serveur" },
  ];
  return (
    <div className="space-y-6">
      <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Aperçu</h2>
      <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
        {groups.map((g, n) => {
          const waiting = g.items.filter((i) => i.state !== "active").length;
          return (
            <section key={g.key} className={cn(n > 0 && "border-t border-line")} aria-label={g.label}>
              <div className="flex items-center gap-2 bg-soft px-4 py-2.5">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-ink-2">{g.label}</h3>
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-surface px-1.5 text-[11.5px] font-bold text-ink-2 ring-1 ring-line">
                  {g.items.length}
                </span>
                {waiting > 0 && <span className="text-[12px] font-semibold text-coral-ink">{waiting} à régler</span>}
                <Link
                  href={g.href}
                  className="-my-2 ml-auto inline-flex min-h-11 items-center gap-1 px-1 text-[13px] font-semibold text-brand-ink hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Ajouter
                </Link>
              </div>
              {g.items.length === 0 ? (
                <p className="px-4 py-4 text-sm text-ink-3">{g.empty}</p>
              ) : (
                <ul className="divide-y divide-line">
                  {g.items.map((i) => (
                    <ListRow key={i.key} item={i} />
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ListRow({ item }: { item: OverviewItem }) {
  const st = STATE[item.state];
  return (
    <li className="flex min-h-16 items-center gap-3 px-4 py-2.5">
      <ItemLogo item={item} />
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <p className="min-w-0 truncate text-[15px] font-semibold text-ink">
          {item.name}
          {item.tools !== null && <span className="ml-2 text-[13px] font-medium text-ink-3">{plural(item.tools, "outil", "outils")}</span>}
        </p>
        <span className={cn("inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold sm:ml-auto", st.pill)}>
          <span className={cn("size-1.5 rounded-full", st.dot)} aria-hidden />
          {st.label}
        </span>
      </div>
      {st.action ? (
        <Button asChild size="sm" variant="secondary" className="shrink-0 pointer-coarse:h-11 pointer-coarse:px-4">
          <Link href={item.href}>{st.action}</Link>
        </Button>
      ) : (
        <Link
          href={item.href}
          aria-label={`Gérer ${item.name}`}
          className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-soft hover:text-ink"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </li>
  );
}
