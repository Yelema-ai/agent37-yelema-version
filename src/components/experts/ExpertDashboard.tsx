"use client";

import { useState } from "react";
import { ExternalLink, LayoutDashboard, Loader2, Maximize2, RefreshCw, Share2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardProvider";
import { useComputer } from "./ComputerProvider";
import { ShareDashboardModal } from "./ShareDashboardModal";

export { ShareDashboardModal };

const WIDE = "(min-width: 85rem)";

function formatMajDate(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return `Mis à jour le ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    }
  } catch {}
  return `Mis à jour : ${dateStr}`;
}

export function DashboardButton() {
  const { profile, panelOpen, setPanelOpen, dialogOpen, setDialogOpen, activeUrl, triggerGeneration, isGenerating } = useDashboard();
  const comp = useComputer();
  if (!profile) return null;

  const isDjeneba = profile.toLowerCase().includes("djeneba");
  const label = isDjeneba ? "Tableaux de l'équipe" : "Tableau de bord";
  const isAnyPanelOpen = panelOpen || Boolean(comp?.panelOpen);

  const handleClick = () => {
    const isWide = typeof window !== "undefined" && window.matchMedia(WIDE).matches;
    if (isWide) {
      setPanelOpen(!panelOpen);
    } else {
      setDialogOpen(!dialogOpen);
    }

    // Ne déclencher la génération QUE si le tableau n'a JAMAIS été généré (aucun lien disponible)
    // et qu'on ouvre le panneau. Si un tableau existe déjà, on ouvre juste le panneau sans envoyer /tableau.
    if (!panelOpen && !activeUrl && !isGenerating) {
      void triggerGeneration();
    }
  };

  return (
    <button
      type="button"
      title={label}
      onClick={handleClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium text-ink transition-colors hover:bg-soft",
        (panelOpen || isGenerating) && "wide:border-brand/40 wide:bg-soft-2 wide:text-brand"
      )}
    >
      {isGenerating ? (
        <Loader2 className="h-3.5 w-3.5 text-brand animate-spin" />
      ) : (
        <LayoutDashboard className="h-3.5 w-3.5 text-brand" />
      )}
      <span className={cn("hidden sm:inline", isAnyPanelOpen && "wide:hidden")}>
        {isGenerating ? "Génération…" : label}
      </span>
    </button>
  );
}

function DashboardHeaderControls({
  onMaximize,
  onClose,
}: {
  onMaximize?: () => void;
  onClose?: () => void;
}) {
  const { activeUrl, refresh, loading, isGenerating, triggerGeneration, data, activeTab, setActiveTab, setShareModalOpen } = useDashboard();

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {data?.isDjeneba && (
        <div className="mr-2 inline-flex rounded-lg border border-line bg-soft p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("equipe")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-all",
              activeTab === "equipe" ? "bg-surface text-ink shadow-sm font-semibold" : "text-ink-3 hover:text-ink"
            )}
          >
            Tous les tableaux
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("metier")}
            className={cn(
              "rounded-md px-2.5 py-1 transition-all",
              activeTab === "metier" ? "bg-surface text-ink shadow-sm font-semibold" : "text-ink-3 hover:text-ink"
            )}
          >
            Direction
          </button>
        </div>
      )}

      {/* Bouton pour régénérer / actualiser les chiffres auprès de l'expert */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={() => void triggerGeneration()}
        disabled={isGenerating || loading}
        title="Actualiser les chiffres auprès de l’expert (/tableau)"
        aria-label="Actualiser les chiffres"
      >
        <Sparkles className={cn("h-3.5 w-3.5 text-brand", isGenerating && "animate-spin")} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={() => void refresh()}
        disabled={loading}
        title="Recharger l'affichage"
        aria-label="Recharger"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      </Button>

      {/* Bouton Partager & Exporter */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={() => setShareModalOpen(true)}
        title="Partager et exporter le tableau de bord"
        aria-label="Partager et exporter"
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>

      {activeUrl && (
        <a
          href={activeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-soft hover:text-ink"
          title="Ouvrir dans un nouvel onglet"
          aria-label="Ouvrir dans un nouvel onglet"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {onMaximize && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-ink-3 hover:text-ink"
          onClick={onMaximize}
          title="Agrandir en plein écran"
          aria-label="Agrandir"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      )}

      {onClose && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-ink-3 hover:text-ink"
          onClick={onClose}
          title="Fermer le panneau"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function DashboardEmptyState({
  agentName,
  isGenerating,
  onGenerate,
}: {
  agentName: string;
  isGenerating: boolean;
  onGenerate: () => void;
}) {
  if (isGenerating) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-tint text-brand shadow-inner">
          <LayoutDashboard className="h-7 w-7 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-brand"></span>
          </span>
        </div>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-tint px-3 py-1 text-xs font-semibold text-brand">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Génération en cours…
        </span>
        <h3 className="text-base font-semibold text-ink">Création de votre tableau de bord</h3>
        <p className="mt-1.5 max-w-sm text-xs text-ink-3 leading-relaxed">
          {agentName} prépare vos indicateurs métier et publie votre page sur Render. L’affichage apparaîtra automatiquement dès sa mise en ligne.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand mb-3">
        <LayoutDashboard className="h-6 w-6" />
      </div>
      <h3 className="text-base font-semibold text-ink">Tableau de bord en attente</h3>
      <p className="mt-1 mb-4 max-w-sm text-xs text-ink-3 leading-relaxed">
        Déclenchez la génération de votre tableau de bord avec les données de l’entreprise en un clic.
      </p>
      <Button
        type="button"
        onClick={onGenerate}
        className="inline-flex items-center gap-2 rounded-xl bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm hover:bg-brand/90 transition-all"
      >
        <LayoutDashboard className="h-4 w-4" />
        Générer mon tableau de bord
      </Button>
    </div>
  );
}

export function DashboardPanel() {
  const { panelOpen, setPanelOpen, setDialogOpen, agentName, activeUrl, embedUrl, data, activeTab, isGenerating, triggerGeneration } = useDashboard();
  const frameSrc = embedUrl || activeUrl;
  if (!panelOpen) return null;

  const title =
    data?.isDjeneba && activeTab === "equipe"
      ? "Tableaux de bord de l'équipe"
      : `Tableau de bord — ${agentName}`;

  return (
    <aside className="hidden max-w-[950px] shrink basis-[60%] flex-col border-l border-line bg-card wide:flex">
      <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-line px-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <LayoutDashboard className="h-4 w-4 text-brand shrink-0" />
            <span className="truncate">{title}</span>
          </p>
          <p className="truncate text-xs text-ink-3">
            {formatMajDate(data?.maj) ?? "Généré à partir des chiffres réels de l'entreprise"}
          </p>
        </div>
        <DashboardHeaderControls onMaximize={() => setDialogOpen(true)} onClose={() => setPanelOpen(false)} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-2 sm:p-3">
        {frameSrc ? (
          <iframe
            src={frameSrc}
            title={title}
            className="h-full w-full rounded-xl border border-line bg-white shadow-sm"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <DashboardEmptyState
            agentName={agentName}
            isGenerating={isGenerating}
            onGenerate={() => void triggerGeneration()}
          />
        )}
      </div>
    </aside>
  );
}

export function DashboardDialog() {
  const { dialogOpen, setDialogOpen, agentName, activeUrl, embedUrl, data, activeTab, isGenerating, triggerGeneration } = useDashboard();
  const frameSrc = embedUrl || activeUrl;

  const title =
    data?.isDjeneba && activeTab === "equipe"
      ? "Tableaux de bord de l'équipe"
      : `Tableau de bord de ${agentName}`;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="max-w-[1250px] h-[92vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-line px-5 py-3.5 text-left space-y-0">
          <div className="min-w-0 pr-4">
            <DialogTitle className="flex items-center gap-2 font-display text-[18px] font-bold tracking-tight text-ink">
              <LayoutDashboard className="h-5 w-5 text-brand shrink-0" />
              <span className="truncate">{title}</span>
            </DialogTitle>
            <DialogDescription className="truncate text-xs text-ink-3 mt-0.5">
              {formatMajDate(data?.maj) ?? "Généré et personnalisé avec les données de l'entreprise"}
            </DialogDescription>
          </div>
          <DashboardHeaderControls onClose={() => setDialogOpen(false)} />
        </DialogHeader>

        <div className="relative flex-1 min-h-0 bg-background p-2 sm:p-4">
          {frameSrc ? (
            <iframe
              src={frameSrc}
              title={title}
              className="h-full w-full rounded-xl border border-line bg-white shadow-sm"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <DashboardEmptyState
              agentName={agentName}
              isGenerating={isGenerating}
              onGenerate={() => void triggerGeneration()}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
