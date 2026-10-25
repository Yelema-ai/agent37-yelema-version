"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Loader2, MoreHorizontal, Plug, Plus, RotateCw, Search, Unplug } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { ACCOUNT_STATE_LABELS, accountState, accountsBySlug } from "@/lib/connection-accounts";
import { isConnectionActive as isActive } from "@/lib/expert-tools";
import { DEFAULT_INTEGRATION_TOOLKITS, catalogToolkit, composioLogoUrl } from "@/lib/integration-catalog";
import type {
  IntegrationConnection,
  IntegrationConnectionsResult,
  IntegrationConnectResult,
  IntegrationToolkit,
  IntegrationToolkitsResult,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToolLogo } from "./ToolLogo";

const SEARCH_DEBOUNCE_MS = 250;
const MIN_SEARCH = 3; // the toolkits route 400s a non-empty query shorter than this
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 45000;

function slugKey(slug: string | null | undefined): string {
  return (slug || "").toLowerCase();
}

function activeCount(conns: IntegrationConnection[], slug: string): number {
  return conns.filter((c) => isActive(c) && slugKey(c.toolkitSlug) === slugKey(slug)).length;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// A tool connected from a search and gone from the catalog comes back with its slug for a name
// (« googleslides », « google_search_console ») : the usual ones by their real name, the others
// spaced and capitalised.
const KNOWN_NAMES: Record<string, string> = {
  googleslides: "Google Slides", googlemeet: "Google Meet", googletasks: "Google Tasks", googlephotos: "Google Photos",
  googlemaps: "Google Maps", googleads: "Google Ads", googlebigquery: "Google BigQuery", google_analytics: "Google Analytics",
  google_search_console: "Google Search Console", googlesuper: "Google Workspace", youtube: "YouTube", linkedin: "LinkedIn",
  whatsapp: "WhatsApp", github: "GitHub", gitlab: "GitLab", hubspot: "HubSpot", clickup: "ClickUp", mailchimp: "Mailchimp",
  sharepoint: "SharePoint", one_drive: "OneDrive", microsoft_teams: "Microsoft Teams", excel: "Excel", openai: "OpenAI",
};

function readableName(slug: string, name: string | null | undefined): string {
  if (name && name !== name.toLowerCase()) return name;
  return KNOWN_NAMES[slug] ?? slug.replace(/[_-]+/g, " ").replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}

// Search results come with English descriptions: a tool from our catalog keeps its French copy, any
// other one shows its name only.
function localized(t: IntegrationToolkit): IntegrationToolkit {
  const ours = catalogToolkit(t.slug);
  return ours ? { ...t, name: ours.name, description: ours.description } : { ...t, description: null };
}

// Connecteurs: the member's tools (Gmail, Drive, Notion…), connected through Yelema's own Composio
// (src/lib/composio.ts). A connection belongs to the member who owns the instance, so every expert
// on it (every Hermes profile) can use it, and nobody else's experts can. A popular catalog shows first; typing searches the full catalog.
export function ConnectorsView({ agentId }: { agentId: string }) {
  const [search, setSearch] = useState("");
  const [remote, setRemote] = useState<{ q: string; items: IntegrationToolkit[] } | null>(null);
  const [connections, setConnections] = useState<IntegrationConnection[] | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollDeadline = useRef(0);

  const fetchConnections = useCallback(async () => {
    const { connections: list } = await apiFetch<IntegrationConnectionsResult>(
      `/api/agents/${agentId}/integrations/connections`
    );
    setConnections(list);
    return list;
  }, [agentId]);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPending(null);
  }, []);

  useEffect(() => {
    fetchConnections().catch((e) => {
      setConnections([]);
      toast.error((e as Error).message);
    });
  }, [fetchConnections]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const q = search.trim();

  // Debounced search of the full catalog from 3 characters; shorter queries filter the list locally.
  useEffect(() => {
    if (q.length < MIN_SEARCH) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      apiFetch<IntegrationToolkitsResult>(`/api/agents/${agentId}/integrations/toolkits?search=${encodeURIComponent(q)}`)
        .then((res) => !cancelled && setRemote({ q, items: res.items.map(localized) }))
        .catch((e) => {
          if (cancelled) return;
          setRemote({ q, items: [] });
          toast.error((e as Error).message);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q, agentId]);

  const accounts = useMemo(() => accountsBySlug(connections ?? []), [connections]);

  // The catalog, plus any connected tool that is not in it (connected from a search).
  const base = useMemo(() => {
    const extra: IntegrationToolkit[] = [];
    for (const c of connections ?? []) {
      const slug = slugKey(c.toolkitSlug);
      if (!slug || catalogToolkit(slug) || extra.some((t) => t.slug === slug)) continue;
      extra.push({
        slug,
        name: readableName(slug, c.toolkitName),
        description: null,
        logo: composioLogoUrl(slug),
        enabled: true,
        isNoAuth: false,
        authSchemes: [],
      });
    }
    return [...extra, ...DEFAULT_INTEGRATION_TOOLKITS];
  }, [connections]);

  const searching = q.length >= MIN_SEARCH && remote?.q !== q;

  const visible = useMemo(() => {
    const nq = normalize(q);
    const local = nq ? base.filter((t) => normalize(`${t.name} ${t.slug} ${t.description ?? ""}`).includes(nq)) : base;
    const found = q.length >= MIN_SEARCH && remote?.q === q ? remote.items : [];
    const seen = new Set(local.map((t) => slugKey(t.slug)));
    const merged = [...local, ...found.filter((t) => !seen.has(slugKey(t.slug)))];
    // Tools with accounts first; the catalog order otherwise (sort is stable).
    return merged.sort((a, b) => Number(accounts.has(slugKey(b.slug))) - Number(accounts.has(slugKey(a.slug))));
  }, [q, base, remote, accounts]);

  // Watch the connections until this tool gains an account (the sign-in happens in another tab) or
  // the deadline passes.
  function startPolling(toolkit: IntegrationToolkit, baseline: number) {
    setPending(slugKey(toolkit.slug));
    pollDeadline.current = Date.now() + POLL_TIMEOUT_MS;
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const conns = await fetchConnections();
        if (activeCount(conns, toolkit.slug) > baseline) {
          stopPolling();
          toast.success(`${toolkit.name} est connecté`);
          return;
        }
      } catch {
        // transient; keep polling until the deadline
      }
      if (Date.now() > pollDeadline.current) stopPolling();
    }, POLL_INTERVAL_MS);
  }

  async function connect(toolkit: IntegrationToolkit) {
    setConnecting(slugKey(toolkit.slug));
    try {
      const { redirectUrl } = await apiFetch<IntegrationConnectResult>(`/api/agents/${agentId}/integrations/connect`, {
        method: "POST",
        body: JSON.stringify({ toolkit: toolkit.slug }),
      });
      window.open(redirectUrl, "_blank", "noopener,noreferrer");
      startPolling(toolkit, activeCount(connections ?? [], toolkit.slug));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConnecting(null);
    }
  }

  // One account at a time: a duplicate or an unfinished connection goes without touching the others.
  async function disconnect(toolkit: IntegrationToolkit, id: string) {
    setDisconnecting(id);
    try {
      await apiFetch(`/api/agents/${agentId}/integrations/connections/${encodeURIComponent(id)}`, { method: "DELETE" });
      toast.success(`Compte ${toolkit.name} retiré`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      await fetchConnections().catch(() => undefined);
      setDisconnecting(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5">
        <p className="text-[15px] text-ink-2">Connectez les outils de l’entreprise : tous vos Experts peuvent s’en servir.</p>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
          <Plug className="h-4 w-4" />
          Plus de 1 000 applications disponibles
        </span>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Chercher un outil"
          aria-label="Chercher un outil"
          className="pl-10 pr-10"
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-3" />
        )}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => {
            const k = slugKey(t.slug);
            return (
              <ToolTile
                key={k}
                toolkit={t}
                accounts={connections === null ? null : (accounts.get(k) ?? [])}
                waiting={connecting === k || pending === k}
                disconnecting={disconnecting}
                onConnect={() => connect(t)}
                onDisconnect={(id) => disconnect(t, id)}
              />
            );
          })}
        </div>
      ) : searching ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[76px] animate-pulse rounded-[22px] border bg-soft" />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed px-6 py-12 text-center text-sm text-ink-3">
          {q.length < MIN_SEARCH
            ? "Tapez au moins 3 lettres pour chercher parmi toutes les applications."
            : `Aucun outil trouvé pour « ${q} ».`}
        </div>
      )}

      {pending && (
        <p className="flex items-center gap-2 text-[13px] text-ink-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Terminez la connexion dans l’onglet qui vient de s’ouvrir.
        </p>
      )}
    </div>
  );
}

const STATE_TONE = {
  active: "bg-ok-pale text-ok",
  pending: "bg-soft text-ink-2",
  failed: "bg-coral-pale text-coral-ink",
  disabled: "bg-soft text-ink-3",
} as const;

// « 12 oct. », the year only when it is not this one.
const dateFr = (ms: number | null | undefined): string => {
  if (!ms) return "";
  const d = new Date(ms);
  const year = d.getFullYear() !== new Date().getFullYear() ? { year: "numeric" as const } : {};
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", ...year });
};

function ToolTile({
  toolkit,
  accounts,
  waiting,
  disconnecting,
  onConnect,
  onDisconnect,
}: {
  toolkit: IntegrationToolkit;
  // null while the connections are still loading
  accounts: IntegrationConnection[] | null;
  waiting: boolean;
  disconnecting: string | null;
  onConnect: () => void;
  onDisconnect: (id: string) => void;
}) {
  const connected = accounts?.some(isActive) ?? false;
  return (
    <div className="rounded-[22px] border bg-card py-3 pl-4 pr-3">
      <div className="flex min-h-[52px] items-center gap-3">
        <ToolLogo logo={toolkit.logo} name={toolkit.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">{toolkit.name}</p>
          {toolkit.description && <p className="truncate text-[13px] text-ink-3">{toolkit.description}</p>}
        </div>

        {accounts === null ? (
          <span className="h-8 w-24 shrink-0 animate-pulse rounded-[10px] bg-soft" />
        ) : accounts.length > 0 ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {connected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-ok-pale px-2.5 py-1 text-xs font-semibold text-ok">
                <Check className="h-3.5 w-3.5" />
                Connecté
              </span>
            ) : (
              // No account answers any more: the tool says so in its head, not only line by line.
              <span className="inline-flex items-center gap-1 rounded-full bg-coral-pale px-2.5 py-1 text-xs font-semibold text-coral-ink">
                <AlertCircle className="h-3.5 w-3.5" />
                À reconnecter
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`Options pour ${toolkit.name}`}
                  disabled={waiting}
                  className="grid h-8 w-8 max-sm:size-10 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-ink disabled:opacity-60"
                >
                  {waiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={onConnect}>
                  <Plus /> Ajouter un compte
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : waiting ? (
          <Button size="sm" variant="outline" disabled className="shrink-0">
            <Loader2 className="animate-spin" />
            En attente
          </Button>
        ) : (
          <Button size="sm" className="shrink-0" onClick={onConnect}>
            Connecter
          </Button>
        )}
      </div>

      {accounts && accounts.length > 0 && (
        <ul className="mt-2 space-y-1 border-t pt-2">
          {accounts.map((a, i) => {
            const state = accountState(a);
            // The account's date tells two accounts apart; its id stays in the tooltip.
            const label = `Compte ${i + 1}`;
            return (
              <li key={a.id} className="flex items-center gap-2 text-[13px]">
                <span className="min-w-0 flex-1 truncate text-ink-2" title={a.id}>
                  {label}
                  {dateFr(a.createdAt) && <span className="text-ink-3"> · {dateFr(a.createdAt)}</span>}
                </span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATE_TONE[state]}`}>
                  {ACCOUNT_STATE_LABELS[state]}
                </span>
                {state !== "active" && (
                  <button
                    type="button"
                    onClick={onConnect}
                    disabled={waiting}
                    aria-label={`Reconnecter ${toolkit.name}`}
                    title="Reconnecter"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-ink disabled:opacity-60 max-sm:size-10"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDisconnect(a.id)}
                  disabled={disconnecting !== null}
                  aria-label={`Déconnecter ${label}`}
                  title="Déconnecter"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-destructive disabled:opacity-60 max-sm:size-10"
                >
                  {disconnecting === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
