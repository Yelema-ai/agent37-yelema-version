"use client";

import { useState } from "react";
import { ExternalLink, LayoutDashboard, Maximize2, RefreshCw, Share2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useDashboard } from "./DashboardProvider";
import { useComputer } from "./ComputerProvider";

const WIDE = "(min-width: 85rem)";

export function DashboardButton() {
  const { profile, agentName, panelOpen, setPanelOpen, setDialogOpen, data } = useDashboard();
  const comp = useComputer();
  if (!profile) return null;

  const isDjeneba = profile.toLowerCase().includes("djeneba");
  const label = isDjeneba ? "Tableaux de l’équipe" : "Tableau de bord";
  const isAnyPanelOpen = panelOpen || Boolean(comp?.panelOpen);

  return (
    <button
      type="button"
      title={label}
      onClick={() => (window.matchMedia(WIDE).matches ? setPanelOpen(!panelOpen) : setDialogOpen(true))}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border bg-card px-2.5 text-xs font-medium text-ink transition-colors hover:bg-soft",
        panelOpen && "wide:border-brand/40 wide:bg-soft-2 wide:text-brand"
      )}
    >
      <LayoutDashboard className="h-3.5 w-3.5 text-brand" />
      <span className={cn("hidden sm:inline", isAnyPanelOpen && "wide:hidden")}>{label}</span>
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
  const { activeUrl, copyShareLink, refresh, loading, data, activeTab, setActiveTab } = useDashboard();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyShareLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRender = (data?.hebergeur ?? "").toLowerCase() === "render";

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

      {/* Cloud hosting badge */}
      <span
        title={data?.lien ? `Hébergé sur ${data.hebergeur || "le cloud"}` : "Gabarit Yelema prêt à être branché"}
        className={cn(
          "mr-1 hidden items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold md:inline-flex",
          data?.lien
            ? "bg-tint text-brand-ink border border-brand/20"
            : "bg-soft-2 text-ink-3 border border-line"
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", data?.lien ? "bg-brand animate-pulse" : "bg-ink-3")} />
        {data?.lien ? (data?.hebergeur ? data.hebergeur.toUpperCase() : "RENDER") : "APERÇU"}
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={() => void refresh()}
        disabled={loading}
        title="Actualiser"
        aria-label="Actualiser"
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink-3 hover:text-ink"
        onClick={handleCopy}
        title="Copier le lien de partage"
        aria-label="Copier le lien"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-brand" /> : <Share2 className="h-3.5 w-3.5" />}
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

export function DashboardPanel() {
  const { panelOpen, setPanelOpen, setDialogOpen, agentName, activeUrl, data, activeTab } = useDashboard();
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
            {data?.maj ? `Mis à jour le ${data.maj}` : "Généré à partir des chiffres réels de l’entreprise"}
          </p>
        </div>
        <DashboardHeaderControls onMaximize={() => setDialogOpen(true)} onClose={() => setPanelOpen(false)} />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background p-2 sm:p-3">
        {activeUrl ? (
          <iframe
            src={activeUrl}
            title={title}
            className="h-full w-full rounded-xl border border-line bg-white shadow-sm"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand mb-3">
              <LayoutDashboard className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-ink">Tableau de bord en attente</h3>
            <p className="mt-1 max-w-sm text-xs text-ink-3 leading-relaxed">
              Demandez à {agentName} de préparer son tableau de bord avec vos chiffres réels en lui écrivant « fais mon tableau de bord » ou en utilisant la commande /tableau.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

export function DashboardDialog() {
  const { dialogOpen, setDialogOpen, agentName, activeUrl, data, activeTab } = useDashboard();

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
              {data?.maj ? `Mis à jour le ${data.maj}` : "Généré et personnalisé avec les données de l’entreprise"}
            </DialogDescription>
          </div>
          <DashboardHeaderControls onClose={() => setDialogOpen(false)} />
        </DialogHeader>

        <div className="relative flex-1 min-h-0 bg-background p-2 sm:p-4">
          {activeUrl ? (
            <iframe
              src={activeUrl}
              title={title}
              className="h-full w-full rounded-xl border border-line bg-white shadow-sm"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint text-brand mb-3">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-ink">Tableau de bord en attente</h3>
              <p className="mt-1 max-w-sm text-xs text-ink-3">
                Écrivez à {agentName} pour générer le tableau de bord avec les chiffres de l’entreprise.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
