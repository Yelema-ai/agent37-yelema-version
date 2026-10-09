"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  Check,
  Eye,
  EyeOff,
  Key,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProviderStatus, ModelSettingsResponse } from "@/lib/models";

// SVG Logos and Icons tailored for LLM providers
function ProviderLogo({ id, name }: { id: string; name: string }) {
  const getStyle = () => {
    switch (id) {
      case "anthropic":
        return { bg: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20", label: "A" };
      case "openai":
        return { bg: "bg-[#10A37F]/10 text-[#10A37F] border-[#10A37F]/20", label: "O" };
      case "openrouter":
        return { bg: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20", label: "OR" };
      case "gemini":
        return { bg: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20", label: "G" };
      case "deepseek":
        return { bg: "bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/20", label: "DS" };
      case "mistral":
        return { bg: "bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/20", label: "M" };
      case "groq":
        return { bg: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20", label: "Gq" };
      case "xai":
        return { bg: "bg-ink/10 text-ink border-ink/20", label: "𝕏" };
      case "together":
        return { bg: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20", label: "T" };
      default:
        return { bg: "bg-soft text-ink border-line", label: name.slice(0, 2).toUpperCase() };
    }
  };

  const style = getStyle();

  return (
    <div
      className={cn(
        "grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border font-bold text-sm tracking-tight select-none",
        style.bg
      )}
    >
      {style.label}
    </div>
  );
}

export function ModelsView({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModelSettingsResponse | null>(null);

  // Dialog state for connecting / editing a provider API key
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [setActiveCheck, setSetActiveCheck] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<ModelSettingsResponse>(`/api/agents/${agentId}/modeles`);
      setData(res);
    } catch (err: any) {
      toast.error("Erreur lors du chargement des modèles", {
        description: err?.message || "Impossible de contacter l'agent.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [agentId]);

  const handleOpenConfig = (provider: ProviderStatus) => {
    setSelectedProvider(provider);
    // Never prefill sensitive key values or fake text
    setApiKeyInput("");
    setSetActiveCheck(true);
    setShowKey(false);
    setConfigOpen(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    if (!selectedProvider.isConfigured && !apiKeyInput.trim()) {
      toast.error("Clé API requise", {
        description: "Veuillez coller votre clé API pour ce fournisseur.",
      });
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: selectedProvider.id,
            apiKey: apiKeyInput.trim() || undefined,
            setActive: setActiveCheck,
          }),
        }
      );

      setData(res.config);
      setConfigOpen(false);
      setApiKeyInput("");
      toast.success(`${selectedProvider.name} connecté avec succès`, {
        description: setActiveCheck
          ? "Défini comme modèle par défaut pour vos experts."
          : "Clé API enregistrée.",
      });
    } catch (err: any) {
      toast.error("Échec de la configuration", {
        description: err?.message || "Une erreur est survenue.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetAsDefault = async (provider: ProviderStatus) => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: provider.id,
            setActive: true,
          }),
        }
      );
      setData(res.config);
      toast.success(`${provider.name} est maintenant le modèle par défaut`);
    } catch (err: any) {
      toast.error("Erreur lors de l'activation", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSetStarterActive = async () => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: "agent37_starter",
            setActive: true,
          }),
        }
      );
      setData(res.config);
      toast.success("Modèle par défaut Yelema réactivé");
    } catch (err: any) {
      toast.error("Erreur lors de l'activation", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProviderKey = async () => {
    if (!deleteTarget) return;
    try {
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles?providerId=${encodeURIComponent(deleteTarget)}`,
        { method: "DELETE" }
      );
      setData(res.config);
      setDeleteTarget(null);
      toast.success("Clé supprimée avec succès");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression", { description: err?.message });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section matching Connectors view */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5">
        <p className="text-[15px] text-ink-2">
          Connectez vos clés API d&apos;intelligence artificielle (BYOK) : tous vos experts peuvent s&apos;en servir.
        </p>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
          <Bot className="h-4 w-4" />
          {data?.providers.length || 9} fournisseurs d&apos;inférence supportés
        </span>
      </div>

      {/* Active Model Banner */}
      {data && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[22px] border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-pale text-brand shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">
                  Moteur Actif
                </p>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-ok opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-ok"></span>
                </span>
              </div>
              <h3 className="text-[15px] font-bold text-ink mt-0.5">
                {data.isStarterActive
                  ? "Yelema Starter (Moteur inclus par défaut)"
                  : `${data.providers.find((p) => p.isActive)?.name || data.activeProvider} (Votre clé API)`}
              </h3>
            </div>
          </div>

          {!data.isStarterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetStarterActive}
              className="text-xs h-8 px-3 rounded-full border-line hover:bg-soft text-ink-2"
            >
              Revenir à Yelema Starter
            </Button>
          )}
        </div>
      )}

      {/* Providers Grid matching ToolTiles */}
      <div className="space-y-3">
        {loading && !data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-[22px] border border-line bg-soft" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data?.providers.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  "flex min-h-[76px] items-center gap-3 rounded-[22px] border border-line bg-surface py-3 pl-4 pr-3 transition-colors",
                  provider.isActive && "ring-1 ring-brand/30 border-brand/40"
                )}
              >
                <ProviderLogo id={provider.id} name={provider.name} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-[15px] font-semibold text-ink">{provider.name}</p>
                    {provider.isActive && (
                      <span className="inline-flex items-center rounded-full bg-brand-pale px-2 py-0.5 text-[10px] font-semibold text-brand shrink-0">
                        Actif
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[13px] text-ink-3">
                    {provider.isConfigured ? provider.maskedKey : provider.description}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {provider.isConfigured ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full bg-ok-pale px-2.5 py-1 text-xs font-semibold text-ok">
                        <Check className="h-3.5 w-3.5" />
                        Connecté
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Options pour ${provider.name}`}
                            className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-ink"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onClick={() => handleOpenConfig(provider)}
                            className="gap-2 text-xs"
                          >
                            <Key className="h-3.5 w-3.5" />
                            Modifier la clé API
                          </DropdownMenuItem>
                          {!provider.isActive && (
                            <DropdownMenuItem
                              onClick={() => handleSetAsDefault(provider)}
                              className="gap-2 text-xs font-medium text-brand focus:text-brand"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              Définir par défaut
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTarget(provider.id);
                              setDeleteName(provider.name);
                            }}
                            className="gap-2 text-xs text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer la clé
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenConfig(provider)}
                      className="rounded-full px-3.5 text-xs h-8"
                    >
                      Connecter
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clean Connect Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">
                Connecter {selectedProvider?.name}
              </DialogTitle>
              <DialogDescription className="text-ink-3 text-xs">
                Collez votre clé API pour connecter ce fournisseur à vos experts.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs font-semibold text-ink">
                  Clé API
                </Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    placeholder={
                      selectedProvider?.isConfigured
                        ? "Laisser vide pour conserver la clé actuelle"
                        : "Collez votre clé API ici (ex: sk-...)"
                    }
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="font-mono text-xs pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="setActiveCheck"
                  checked={setActiveCheck}
                  onChange={(e) => setSetActiveCheck(e.target.checked)}
                  className="rounded border-line text-brand focus:ring-brand h-4 w-4"
                />
                <Label htmlFor="setActiveCheck" className="text-xs text-ink-2 cursor-pointer select-none">
                  Définir comme modèle par défaut pour tous les experts
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfigOpen(false)}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer la clé API"
        description={`Êtes-vous sûr de vouloir supprimer la clé pour ${deleteName} ? Le système réactivera le modèle par défaut si ce fournisseur était actif.`}
        confirmText="Supprimer"
        destructive={true}
        onConfirm={handleDeleteProviderKey}
      />
    </div>
  );
}
