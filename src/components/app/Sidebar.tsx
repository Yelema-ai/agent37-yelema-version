"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Blocks, Lock, PanelLeftClose, Search, Settings2, SquarePen } from "lucide-react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { usePublicConfig } from "@/components/PublicConfigProvider";
import { AccountMenu } from "@/components/AccountMenu";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { ExpertItem } from "@/components/experts/ExpertItem";
import { useOwnAgentId } from "@/components/conversations/useAllConversations";
import { openSearch } from "@/components/conversations/SearchDialog";
import type { ChatSession } from "@/components/chat/types";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// Le haut du menu : « Nouvelle conversation » (l'accueil et sa barre de chat), en couleur, puis
// Rechercher (Ctrl K) et Intégrations. Recruter n'est plus au menu (Leslie, 23/10) ; sa page reste à
// son adresse. Une entrée n'apparaît ici que lorsque son écran existe.

export function Sidebar({ collapsed, onToggle, onNavigate }: { collapsed: boolean; onToggle: () => void; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { current } = useWorkspace();
  // The company's main logo first (« Entreprise »), then the deployment's, then the initial.
  // Never the Yelema Y here: it is only the tab icon (favicon), Yelema stays in « Powered by ».
  const deploymentLogo = usePublicConfig().logoUrl;
  const logoUrl = current?.logo_url ?? deploymentLogo;
  const { experts: installed, unreadable } = useExpertsContext();
  // Djénéba heads « Mes Experts », the others follow in their order.
  const experts = [...installed].sort((a, b) => Number(isDjeneba(b)) - Number(isDjeneba(a)));
  const ownAgentId = useOwnAgentId();

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-col gap-0.5 overflow-y-auto border-r border-line bg-surface px-3 py-3.5",
        collapsed && "px-2.5 items-center"
      )}
    >
      <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
        <Link href="/" className={cn("flex min-w-0 items-center gap-2.5 px-2 pt-1.5 pb-3.5", !collapsed && "flex-1")}>
          {logoUrl ? (
            // Le logo du client. Yelema reste en pied, en « Powered by ». Entier, jamais rogné : contenu dans
            // sa case, avec une petite marge, menu ouvert ou replié.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="size-10 shrink-0 rounded-xl bg-surface object-contain p-0.5" />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-on-brand">
              {(current?.name?.trim()[0] ?? "?").toUpperCase()}
            </span>
          )}
          {!collapsed && (
            <span className="min-w-0">
              <b className="block truncate text-[15px] text-ink">{current?.name ?? "…"}</b>
              <span className="block text-[11px] text-ink-3">Espace de travail</span>
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Déplier le menu" : "Replier le menu"}
          title={collapsed ? "Déplier le menu" : "Replier le menu"}
          className={cn("grid size-10 shrink-0 place-items-center rounded-[11px] text-ink-2 hover:bg-soft hover:text-ink", !collapsed && "mb-2")}
        >
          <PanelLeftClose className={cn("size-5", collapsed && "-scale-x-100")} />
        </button>
      </div>

      <Link
        href="/"
        onClick={onNavigate}
        title="Nouvelle conversation"
        className={cn(
          "mb-1.5 flex min-h-11 items-center gap-2.5 rounded-xl bg-brand px-3 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90",
          collapsed && "justify-center px-0"
        )}
      >
        <SquarePen className="size-5 shrink-0" strokeWidth={1.9} />
        {!collapsed && "Nouvelle conversation"}
      </Link>
      <button
        type="button"
        onClick={openSearch}
        title="Rechercher (Ctrl K)"
        className={cn("flex min-h-10 items-center gap-2.5 rounded-[11px] px-2.5 text-sm font-semibold transition-colors text-ink-2 hover:bg-soft", collapsed && "justify-center px-0")}
      >
        <Search className="size-5 shrink-0" strokeWidth={1.9} />
        {!collapsed && (
          <>
            Rechercher
            <kbd className="ml-auto rounded-md border border-line px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-3">Ctrl K</kbd>
          </>
        )}
      </button>
      <Link
        href="/integrations"
        onClick={onNavigate}
        className={cn(
          "flex min-h-10 items-center gap-2.5 rounded-[11px] px-2.5 text-sm font-semibold transition-colors",
          pathname.startsWith("/integrations") ? "bg-soft-2 text-ink" : "text-ink-2 hover:bg-soft",
          collapsed && "justify-center px-0"
        )}
      >
        <Blocks className="size-5 shrink-0" strokeWidth={1.9} />
        {!collapsed && "Intégrations"}
      </Link>

      {!collapsed && (
        <div className="px-2.5 pt-4 pb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-3">Mes Experts</div>
      )}

      {experts.map((e) => (
        <ExpertItem
          // Keyed on instance and profile: a profile name alone is not unique across instances.
          key={`${e.agentId}:${e.profileId}`}
          expert={e}
          active={pathname === `/experts/${e.agentId}/${e.profileId}` || pathname.startsWith(`/experts/${e.agentId}/${e.profileId}/`)}
          compact={collapsed}
          onNavigate={onNavigate}
        />
      ))}

      {/* Une instance illisible ne doit pas raccourcir la liste en silence. */}
      {!collapsed && unreadable > 0 && (
        <p className="px-2.5 py-1.5 text-xs text-ink-3">
          {unreadable === 1 ? "1 instance illisible" : `${unreadable} instances illisibles`}
        </p>
      )}

      {!collapsed && ownAgentId && <CompanyChats agentId={ownAgentId} pathname={pathname} onNavigate={onNavigate} />}

      {!collapsed && (
        <Link
          href="/conversations"
          onClick={onNavigate}
          className={cn(
            "mt-3 flex min-h-10 items-center gap-1.5 rounded-[11px] px-2.5 text-sm font-semibold transition-colors",
            pathname.startsWith("/conversations") ? "bg-soft-2 text-ink" : "text-ink-2 hover:bg-soft"
          )}
        >
          Toutes les conversations <ArrowRight className="size-4" />
        </Link>
      )}

      <div className="mt-auto flex w-full flex-col gap-0.5 border-t border-line pt-3">
        <Link
          href="/administration"
          className={cn(
            "flex min-h-10 items-center gap-2.5 rounded-[11px] px-2.5 text-sm font-semibold transition-colors",
            pathname.startsWith("/administration")
              ? "bg-soft-2 text-ink"
              : "text-ink-2 hover:bg-soft",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings2 className="size-5 shrink-0" strokeWidth={1.9} />
          {!collapsed && "Administration"}
        </Link>

        <AccountMenu collapsed={collapsed} />

        <a
          href="https://yelema.ai"
          target="_blank"
          rel="noopener"
          className={cn(
            "mt-1 flex items-center justify-center gap-2 rounded-xl bg-soft px-2.5 py-2.5 text-xs text-ink-3",
            collapsed && "px-0"
          )}
        >
          {!collapsed && "Powered by"}
          <Image src="/yelema-long.png" alt="Yelema" width={55} height={16} className="h-4 w-auto" />
        </a>
      </div>
    </aside>
  );
}

const isDjeneba = (e: { catalogueKey?: string | null; profileId: string }) =>
  (e.catalogueKey ?? e.profileId).toLowerCase().includes("djeneba");

// The latest conversations of the chat d'entreprise, under a lock: private to the company. An
// Expert's conversations stay in its space. A failed read shows nothing rather than an error here.
function CompanyChats({ agentId, pathname, onNavigate }: { agentId: string; pathname: string; onNavigate?: () => void }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  useEffect(() => {
    let live = true;
    apiFetch<{ sessions: ChatSession[] }>(`/api/agents/${agentId}/chat/sessions`).then(
      (r) => live && setSessions(r.sessions.filter((s) => !s.routine).slice(0, 6)),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [agentId, pathname]);
  const home = `/experts/${agentId}/chat`;
  return (
    <>
      <Link
        href={home}
        onClick={onNavigate}
        className={cn(
          "mt-3 flex items-center gap-1.5 rounded-[11px] px-2.5 pt-1 pb-1.5 text-xs font-semibold uppercase tracking-wide",
          pathname === home ? "text-ink" : "text-ink-3 hover:text-ink"
        )}
      >
        <Lock className="size-3.5" strokeWidth={2.2} />
        Chat d’entreprise
      </Link>
      {sessions.map((s) => (
        <Link
          key={s.session_id}
          href={`${home}?session=${encodeURIComponent(s.session_id)}`}
          onClick={onNavigate}
          title={s.title || "Nouvelle conversation"}
          className="flex min-h-9 items-center rounded-[11px] px-2.5 text-[13px] font-medium text-ink-2 hover:bg-soft"
        >
          <span className="truncate">{s.title || "Nouvelle conversation"}</span>
        </Link>
      ))}
    </>
  );
}
