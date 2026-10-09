"use client";

import { useEffect, useState } from "react";
import {
  Bot,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
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
import { ProviderStatus, CustomProviderInfo, ModelSettingsResponse } from "@/lib/models";

export function ModelsView({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModelSettingsResponse | null>(null);

  // Dialog state for standard providers
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [setActiveCheck, setSetActiveCheck] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dialog state for custom endpoints
  const [customOpen, setCustomOpen] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customBaseUrl, setCustomBaseUrl] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [customSetActive, setCustomSetActive] = useState(true);
  const [customSubmitting, setCustomSubmitting] = useState(false);

  // Delete dialog
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
    setApiKeyInput("");
    setModelInput(provider.defaultModel);
    setSetActiveCheck(true);
    setShowKey(false);
    setConfigOpen(true);
  };

  const handleSaveStandardProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    if (!selectedProvider.isConfigured && !apiKeyInput.trim()) {
      toast.error("Clé API requise", {
        description: "Veuillez renseigner votre clé API pour ce fournisseur.",
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
            model: modelInput.trim() || selectedProvider.defaultModel,
            setActive: setActiveCheck,
          }),
        }
      );

      setData(res.config);
      setConfigOpen(false);
      toast.success(`${selectedProvider.name} configuré avec succès`, {
        description: setActiveCheck
          ? `Modèle actif : ${modelInput || selectedProvider.defaultModel}`
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

  const handleSaveCustomProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) {
      toast.error("Nom requis", { description: "Donnez un nom à votre fournisseur." });
      return;
    }
    if (!customBaseUrl.trim()) {
      toast.error("URL requise", { description: "L'URL de base (Base URL) est requise." });
      return;
    }

    try {
      setCustomSubmitting(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: "custom",
            customName: customName.trim(),
            baseUrl: customBaseUrl.trim(),
            apiKey: customApiKey.trim() || undefined,
            model: customModel.trim() || "default",
            setActive: customSetActive,
          }),
        }
      );

      setData(res.config);
      setCustomOpen(false);
      toast.success("Point de terminaison personnalisé ajouté", {
        description: `Modèle configuré : ${customName}`,
      });
    } catch (err: any) {
      toast.error("Échec de l'ajout", {
        description: err?.message || "Une erreur est survenue.",
      });
    } finally {
      setCustomSubmitting(false);
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
      toast.success("Modèle par défaut Yelema activé");
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
    <div className="space-y-8 animate-in fade-in-50 duration-200">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Fournisseurs & Modèles LLM (BYOK)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connectez vos propres clés API (Anthropic, OpenAI, OpenRouter, Gemini, DeepSeek) ou utilisez le moteur par défaut Yelema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSettings}
            disabled={loading}
            className="h-9 px-3 gap-1.5"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
          <Button
            onClick={() => {
              setCustomName("");
              setCustomBaseUrl("");
              setCustomApiKey("");
              setCustomModel("");
              setCustomSetActive(true);
              setCustomOpen(true);
            }}
            size="sm"
            className="h-9 px-3.5 gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Ajouter un endpoint
          </Button>
        </div>
      </div>

      {/* Active Model Status Card */}
      {data && (
        <div className="p-5 rounded-xl border border-primary/20 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary mt-0.5">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Moteur Actif de l&apos;espace
                </span>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <h3 className="text-lg font-bold text-foreground mt-0.5">
                {data.isStarterActive
                  ? "Yelema Starter (Agent37 Moteur Inclus)"
                  : `${data.activeProvider} : ${data.activeModel}`}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {data.isStarterActive
                  ? "Fourni clé en main par votre abonnement Yelema sans configuration requise."
                  : "Vos experts et tâches utilisent directement votre clé API dédiée."}
              </p>
            </div>
          </div>

          {!data.isStarterActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetStarterActive}
              className="text-xs h-8 px-3 border-primary/30 hover:bg-primary/10"
            >
              Revenir à Yelema Starter
            </Button>
          )}
        </div>
      )}

      {/* Providers Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Fournisseurs Pris en Charge
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sélectionnez un fournisseur pour renseigner votre clé API et choisir le modèle par défaut.
          </p>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Chargement des modèles configurés...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data?.providers.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  "p-5 rounded-xl border transition-all duration-150 flex flex-col justify-between group",
                  provider.isActive
                    ? "bg-card border-primary/40 shadow-sm ring-1 ring-primary/20"
                    : provider.isConfigured
                    ? "bg-card border-border/70 hover:border-border"
                    : "bg-card/60 border-border/40 hover:border-border/80"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-secondary text-foreground font-semibold">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          {provider.name}
                          {provider.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
                              Actif
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                          {provider.envVar}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-70 group-hover:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleOpenConfig(provider)}
                          className="gap-2 text-xs"
                        >
                          <Key className="h-3.5 w-3.5" />
                          {provider.isConfigured ? "Modifier la clé" : "Configurer"}
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="gap-2 text-xs">
                          <a
                            href={provider.docUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Obtenir une clé
                          </a>
                        </DropdownMenuItem>
                        {provider.isConfigured && (
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
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                    {provider.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs">
                    {provider.isConfigured ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {provider.maskedKey}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[11px]">Non configuré</span>
                    )}
                  </div>

                  <Button
                    variant={provider.isConfigured ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleOpenConfig(provider)}
                    className="h-7 text-xs px-2.5"
                  >
                    {provider.isConfigured ? "Gérer" : "Connecter"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Custom Endpoints List (if any) */}
      {data && data.customProviders && data.customProviders.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border/40">
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Points de terminaison personnalisés (Ollama, vLLM, Passerelles)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.customProviders.map((cp) => (
              <div
                key={cp.name}
                className={cn(
                  "p-5 rounded-xl border bg-card flex flex-col justify-between",
                  cp.isActive ? "border-primary/40 ring-1 ring-primary/20" : "border-border/60"
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-secondary text-foreground">
                        <Server className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
                          {cp.name}
                          {cp.isActive && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/15 text-primary">
                              Actif
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-muted-foreground truncate max-w-[180px] block">
                          {cp.baseUrl}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setDeleteTarget(`custom:${cp.name}`);
                        setDeleteName(cp.name);
                      }}
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/40 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Modèle : {cp.model}</span>
                  {cp.hasKey && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {cp.maskedKey}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Provider Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveStandardProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Configurer {selectedProvider?.name}
              </DialogTitle>
              <DialogDescription>
                Renseignez votre clé API pour alimenter les agents avec ce fournisseur.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apiKey" className="text-xs font-semibold">
                    Clé API ({selectedProvider?.envVar})
                  </Label>
                  {selectedProvider?.docUrl && (
                    <a
                      href={selectedProvider.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      Créer une clé <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showKey ? "text" : "password"}
                    placeholder={
                      selectedProvider?.isConfigured
                        ? `${selectedProvider.maskedKey} (Laisser vide pour conserver)`
                        : selectedProvider?.placeholderKey
                    }
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {selectedProvider?.isConfigured && !apiKeyInput && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    ✓ Une clé API est déjà configurée pour ce fournisseur.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs font-semibold">
                  Modèle par défaut
                </Label>
                <div className="space-y-1.5">
                  <Input
                    id="model"
                    placeholder={selectedProvider?.defaultModel}
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="text-xs font-mono"
                  />
                  {selectedProvider?.models && selectedProvider.models.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedProvider.models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModelInput(m)}
                          className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-mono border transition-colors",
                            modelInput === m
                              ? "bg-primary/15 border-primary text-primary font-medium"
                              : "bg-secondary/50 border-border/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="setActiveCheck"
                  checked={setActiveCheck}
                  onChange={(e) => setSetActiveCheck(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="setActiveCheck" className="text-xs cursor-pointer">
                  Définir immédiatement comme modèle principal pour tous les experts
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

      {/* Custom Endpoint Dialog */}
      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveCustomProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Ajouter un point de terminaison personnalisé
              </DialogTitle>
              <DialogDescription>
                Compatible OpenAI (Ollama, vLLM, LM Studio, Passerelle interne).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customName" className="text-xs font-semibold">
                  Nom du fournisseur
                </Label>
                <Input
                  id="customName"
                  placeholder="ex: Ollama-Local, vLLM-Cluster"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customBaseUrl" className="text-xs font-semibold">
                  URL de base (Base URL)
                </Label>
                <Input
                  id="customBaseUrl"
                  placeholder="http://localhost:11434/v1 ou https://mon-serveur/v1"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  className="text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customApiKey" className="text-xs font-semibold">
                  Clé API (Optionnel si local)
                </Label>
                <Input
                  id="customApiKey"
                  type="password"
                  placeholder="sk-..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customModel" className="text-xs font-semibold">
                  Nom du modèle
                </Label>
                <Input
                  id="customModel"
                  placeholder="ex: llama3.3:latest, mistral, custom-v1"
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="customSetActive"
                  checked={customSetActive}
                  onChange={(e) => setCustomSetActive(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <Label htmlFor="customSetActive" className="text-xs cursor-pointer">
                  Activer immédiatement ce point de terminaison
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomOpen(false)}
                disabled={customSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={customSubmitting}>
                {customSubmitting ? (
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
