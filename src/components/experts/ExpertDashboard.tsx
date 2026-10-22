"use client";

import { useState } from "react";
import { Download, ExternalLink, FileCode, FileText, LayoutDashboard, Loader2, Maximize2, RefreshCw, Share2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
  const {
    activeUrl,
    refresh,
    loading,
    isGenerating,
    triggerGeneration,
    data,
    activeTab,
    setActiveTab,
    setShareModalOpen,
    downloadPdf,
    downloadHtml,
  } = useDashboard();

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

      {/* Bouton Exporter / Télécharger dédié (séparé du partage) */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-ink-3 hover:text-ink"
            title="Télécharger / Exporter le tableau de bord"
            aria-label="Télécharger"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 p-1.5 shadow-lg border-line bg-surface z-50">
          <div className="px-2 py-1.5 text-xs font-semibold text-ink">
            Exporter le tableau de bord
          </div>
          <DropdownMenuItem
            onClick={downloadPdf}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs cursor-pointer hover:bg-soft focus:bg-soft text-ink"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-orange-500/10 text-orange-600">
              <FileText className="size-4" />
            </div>
            <div>
              <p className="font-medium text-ink">Télécharger en PDF</p>
              <p className="text-[10.5px] text-ink-3">Livrable officiel A4 paysage</p>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={downloadHtml}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs cursor-pointer hover:bg-soft focus:bg-soft text-ink"
          >
            <div className="flex size-7 items-center justify-center rounded-md bg-blue-500/10 text-blue-600">
              <FileCode className="size-4" />
            </div>
            <div>
              <p className="font-medium text-ink">Télécharger en HTML</p>
              <p className="text-[10.5px] text-ink-3">Page web autonome complète</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Bouton Partager (dédié à la visibilité et au partage du lien) */}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={() => setShareModalOpen(true)}
        title="Partager le tableau de bord"
        aria-label="Partager"
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
          title="Fermer"
          aria-label="Fermer"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function DashboardHeader({
  onMaximize,
  onClose,
}: {
  onMaximize?: () => void;
  onClose?: () => void;
}) {
  const { agentName, data, activeTab } = useDashboard();
  const isEquipeTab = activeTab === "equipe" && data?.isDjeneba;
  const title = isEquipeTab
    ? "Tableaux de bord de l'équipe"
    : (data?.title || `Tableau de bord — ${agentName}`);
  const description = isEquipeTab
    ? "Vue consolidée des 13 experts sous la supervision de Djénéba"
    : (data?.role || null);
  const majFormatted = formatMajDate(data?.maj);

  return (
    <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
      <div className="min-w-0 pr-2">
        <h2 className="truncate text-sm font-semibold text-ink">{title}</h2>
        <div className="flex items-center gap-2 text-xs text-ink-3">
          {description && <span className="truncate">{description}</span>}
          {description && majFormatted && <span>•</span>}
          {majFormatted && <span className="shrink-0">{majFormatted}</span>}
        </div>
      </div>
      <DashboardHeaderControls onMaximize={onMaximize} onClose={onClose} />
    </div>
  );
}

function DashboardContent() {
  const { embedUrl, loading, isGenerating, triggerGeneration, data } = useDashboard();

  if (loading && !embedUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-brand" />
        <p className="text-xs text-ink-3">Chargement du tableau de bord…</p>
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-soft text-ink-3">
          <LayoutDashboard className="size-6 text-brand" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-ink">
          {data?.title || "Tableau de bord non disponible"}
        </h3>
        <p className="mb-4 max-w-xs text-xs text-ink-3">
          {data?.role || "Aucun tableau de bord n'a encore été généré pour cet expert."}
        </p>
        <Button
          size="sm"
          onClick={() => void triggerGeneration()}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération en cours…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Générer le tableau de bord (/tableau)
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="relative flex-1 overflow-hidden bg-surface">
        <iframe
          src={embedUrl}
          title="Tableau de bord"
          className="h-full w-full border-0 bg-transparent"
          sandbox="allow-scripts allow-forms allow-popups allow-downloads"
        />
      </div>
    </div>
  );
}

export function DashboardPanel() {
  const { profile, panelOpen, setPanelOpen, setDialogOpen } = useDashboard();
  if (!profile || !panelOpen) return null;

  return (
    <aside
      aria-label="Tableau de bord métier"
      className="hidden wide:flex fixed inset-y-0 right-0 z-40 w-[640px] flex-col border-l border-line bg-card shadow-xl transition-all"
    >
      <DashboardHeader
        onMaximize={() => {
          setPanelOpen(false);
          setDialogOpen(true);
        }}
        onClose={() => setPanelOpen(false)}
      />
      <DashboardContent />
    </aside>
  );
}

export function DashboardDialog() {
  const { profile, dialogOpen, setDialogOpen } = useDashboard();
  if (!profile) return null;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="flex h-[90vh] w-[95vw] max-w-[1400px] flex-col overflow-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Tableau de bord métier</DialogTitle>
          <DialogDescription>Visualisation du tableau de bord de l'expert</DialogDescription>
        </DialogHeader>
        <DashboardHeader onClose={() => setDialogOpen(false)} />
        <DashboardContent />
      </DialogContent>
    </Dialog>
  );
}
