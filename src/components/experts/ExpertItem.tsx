import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useExpertActivity } from "@/components/activity/hooks";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { agentTabPath } from "@/lib/expert-tabs";
import type { Expert } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Une ligne d'Expert. Unité partagée : barre latérale, accueil, et tout écran qui en liste.
 *
 * Le sous-titre suit ce qu'on sait : le métier que donne le catalogue, sinon le nom de l'instance.
 *
 * `compact` n'affiche que le visage (menu replié).
 */
export function ExpertItem({
  expert,
  active = false,
  compact = false,
  className,
}: {
  expert: Expert;
  active?: boolean;
  compact?: boolean;
  className?: string;
}) {
  // Never the profile or instance id: a member has no use for either.
  const subtitle = expert.title ?? expert.role ?? expert.agentName ?? "";
  const { running, unread } = useExpertActivity(expert.agentId, expert.profileId);
  const hint = unread ? (unread === 1 ? "1 nouvelle réponse" : `${unread} nouvelles réponses`) : running ? "En cours" : null;

  return (
    <Link
      href={agentTabPath(expert.agentId, "chat", expert.profileId)}
      title={hint ? `${expert.displayName} · ${hint}` : expert.displayName}
      className={cn(
        "flex min-h-12 items-center gap-2.5 rounded-[11px] px-2 text-sm font-semibold transition-colors",
        active ? "bg-soft-2 text-ink" : "text-ink-2 hover:bg-soft",
        compact && "justify-center px-0",
        className
      )}
    >
      <span className="relative shrink-0">
        <ExpertAvatar expert={expert} />
        {compact && (unread > 0 || running) && (
          <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface", unread ? "bg-brand" : "animate-pulse bg-ink-3")} aria-hidden />
        )}
      </span>
      {!compact && (
        <span className="min-w-0 grow">
          <span className="block truncate">{expert.displayName}</span>
          <small className="block truncate text-xs font-medium text-ink-3">{subtitle}</small>
        </span>
      )}
      {!compact && unread > 0 && (
        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold text-on-brand" aria-label={hint ?? undefined}>
          {unread}
        </span>
      )}
      {!compact && !unread && running && <Loader2 className="size-3.5 shrink-0 animate-spin text-ink-3" aria-label="En cours" />}
    </Link>
  );
}
