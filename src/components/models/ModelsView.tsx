"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Layers,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
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
import { ProviderStatus, ModelSettingsResponse, CustomProviderInfo } from "@/lib/models";

// SVG Logos and Icons tailored for LLM providers
function ProviderLogo({ id, name }: { id: string; name: string }) {
  const getStyle = () => {
    switch (id) {
      case "openrouter":
        return { bg: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20", label: "OR" };
      case "anthropic":
        return { bg: "bg-[#D97706]/10 text-[#D97706] border-[#D97706]/20", label: "A" };
      case "openai":
        return { bg: "bg-[#10A37F]/10 text-[#10A37F] border-[#10A37F]/20", label: "O" };
      case "gemini":
        return { bg: "bg-[#2563EB]/10 text-[#2563EB] border-[#2563EB]/20", label: "G" };
      case "deepseek":
        return { bg: "bg-[#0284C7]/10 text-[#0284C7] border-[#0284C7]/20", label: "DS" };
      case "qwen":
        return { bg: "bg-[#FF6A00]/10 text-[#FF6A00] border-[#FF6A00]/20", label: "QW" };
      case "mistral":
        return { bg: "bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/20", label: "M" };
      case "groq":
        return { bg: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20", label: "Gq" };
      case "xai":
        return { bg: "bg-ink/10 text-ink border-ink/20", label: "𝕏" };
      case "ollama":
        return { bg: "bg-[#000000]/10 text-[#000000] border-[#000000]/20", label: "🦙" };
      case "lmstudio":
        return { bg: "bg-[#7928CA]/10 text-[#7928CA] border-[#7928CA]/20", label: "LM" };
      case "perplexity":
        return { bg: "bg-[#22B8CD]/10 text-[#22B8CD] border-[#22B8CD]/20", label: "PX" };
      case "huggingface":
        return { bg: "bg-[#FFD21E]/20 text-[#D97706] border-[#FFD21E]/30", label: "🤗" };
      case "minimax":
        return { bg: "bg-[#00D084]/10 text-[#00D084] border-[#00D084]/20", label: "MM" };
      case "nous":
        return { bg: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20", label: "NP" };
      case "copilot":
        return { bg: "bg-[#24292F]/10 text-[#24292F] border-[#24292F]/20", label: "CP" };
      case "together":
        return { bg: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20", label: "T" };
      case "deepinfra":
        return { bg: "bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20", label: "DI" };
      case "fireworks":
        return { bg: "bg-[#E11D48]/10 text-[#E11D48] border-[#E11D48]/20", label: "FW" };
      case "custom":
        return { bg: "bg-brand/10 text-brand border-brand/20", label: "⚙" };
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

// Helpers for OpenRouter PKCE OAuth flow
function generateRandomString(length: number): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  const binary = String.fromCharCode(...new Uint8Array(digest));
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function ModelsView({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ModelSettingsResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog state for connecting / editing a standard provider
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null);
  const [authTab, setAuthTab] = useState<"api_key" | "oauth">("api_key");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [customBaseUrlInputForProvider, setCustomBaseUrlInputForProvider] = useState("");
  const [customModelInputForProvider, setCustomModelInputForProvider] = useState("");
  const [oauthTokenInput, setOauthTokenInput] = useState("");
  const [setActiveCheck, setSetActiveCheck] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState(false);

  // Private endpoint dialog state
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [editingCustom, setEditingCustom] = useState<CustomProviderInfo | null>(null);
  const [customNameInput, setCustomNameInput] = useState("");
  const [customBaseUrlInput, setCustomBaseUrlInput] = useState("");
  const [customModelInput, setCustomModelInput] = useState("");
  const [customApiKeyInput, setCustomApiKeyInput] = useState("");
  const [customSetActiveCheck, setCustomSetActiveCheck] = useState(true);
  const [customSubmitting, setCustomSubmitting] = useState(false);

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

  // Handle OpenRouter OAuth PKCE redirect callback if present in URL
  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");

    if (code) {
      const verifier = sessionStorage.getItem("openrouter_code_verifier");
      const savedSetActive = sessionStorage.getItem("openrouter_set_active") !== "false";

      if (verifier) {
        const handleOAuthExchange = async () => {
          try {
            setLoading(true);
            toast.loading("Finalisation de la connexion OpenRouter...", { id: "oauth-exchange" });

            const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
              `/api/agents/${agentId}/modeles`,
              {
                method: "POST",
                body: JSON.stringify({
                  providerId: "openrouter",
                  oauthCode: code,
                  codeVerifier: verifier,
                  authMethod: "oauth",
                  setActive: savedSetActive,
                }),
              }
            );

            setData(res.config);
            sessionStorage.removeItem("openrouter_code_verifier");
            sessionStorage.removeItem("openrouter_set_active");

            window.history.replaceState({}, document.title, window.location.pathname);

            toast.success("OpenRouter connecté avec succès via OAuth !", {
              id: "oauth-exchange",
              description: savedSetActive
                ? "Défini comme modèle par défaut pour tous vos experts."
                : "Compte lié avec succès.",
            });
          } catch (err: any) {
            console.error("OpenRouter OAuth callback error:", err);
            sessionStorage.removeItem("openrouter_code_verifier");
            window.history.replaceState({}, document.title, window.location.pathname);
            toast.error("Échec de l'authentification OpenRouter OAuth", {
              id: "oauth-exchange",
              description: err?.message || "Veuillez réessayer ou utiliser une Clé API manuelle.",
            });
          } finally {
            setLoading(false);
          }
        };

        handleOAuthExchange();
      }
    }
  }, [agentId]);

  const handleOpenConfig = (provider: ProviderStatus) => {
    setSelectedProvider(provider);
    setAuthTab(provider.authMethod === "oauth" ? "oauth" : "api_key");
    setApiKeyInput("");
    setCustomBaseUrlInputForProvider(provider.defaultBaseUrl || "");
    setCustomModelInputForProvider(provider.defaultModel || "");
    setOauthTokenInput("");
    setSetActiveCheck(true);
    setShowKey(false);
    setConfigOpen(true);
  };

  const handleStartOpenRouterOAuth = async () => {
    if (typeof window === "undefined") return;
    try {
      setOauthRedirecting(true);
      const verifier = generateRandomString(64);
      const challenge = await generateCodeChallenge(verifier);

      sessionStorage.setItem("openrouter_code_verifier", verifier);
      sessionStorage.setItem("openrouter_set_active", setActiveCheck ? "true" : "false");

      const callbackUrl = window.location.origin + window.location.pathname;
      const authUrl = `https://openrouter.ai/auth?callback_url=${encodeURIComponent(
        callbackUrl
      )}&code_challenge=${challenge}&code_challenge_method=S256`;

      window.location.href = authUrl;
    } catch (err: any) {
      setOauthRedirecting(false);
      toast.error("Erreur lors de l'initialisation OAuth", { description: err?.message });
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;

    if (authTab === "api_key") {
      if (!selectedProvider.isLocal && !selectedProvider.isConfigured && !apiKeyInput.trim()) {
        toast.error("Clé API requise", {
          description: "Veuillez saisir votre clé API pour ce fournisseur.",
        });
        return;
      }
    } else {
      if (selectedProvider.id === "openrouter") {
        await handleStartOpenRouterOAuth();
        return;
      }

      if (!oauthTokenInput.trim() && !selectedProvider.isConfigured) {
        toast.error("Jeton ou identifiant requis", {
          description: "Veuillez saisir le jeton de session / OAuth.",
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: selectedProvider.id,
            apiKey: authTab === "api_key" ? apiKeyInput.trim() || undefined : undefined,
            oauthToken: authTab === "oauth" ? oauthTokenInput.trim() || undefined : undefined,
            authMethod: authTab,
            baseUrl: customBaseUrlInputForProvider.trim() || undefined,
            model: customModelInputForProvider.trim() || undefined,
            setActive: setActiveCheck,
          }),
        }
      );

      setData(res.config);
      setConfigOpen(false);
      setApiKeyInput("");
      setOauthTokenInput("");
      toast.success(`${selectedProvider.name} connecté avec succès`, {
        description: setActiveCheck
          ? "Défini comme modèle par défaut pour vos experts."
          : "Identifiants enregistrés.",
      });
    } catch (err: any) {
      toast.error("Échec de la configuration", {
        description: err?.message || "Une erreur est survenue.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Private endpoint dialog handler
  const handleOpenCustomModal = (custom?: CustomProviderInfo) => {
    if (custom) {
      setEditingCustom(custom);
      setCustomNameInput(custom.name);
      setCustomBaseUrlInput(custom.baseUrl);
      setCustomModelInput(custom.model);
      setCustomApiKeyInput("");
      setCustomSetActiveCheck(custom.isActive);
    } else {
      setEditingCustom(null);
      setCustomNameInput("");
      setCustomBaseUrlInput("");
      setCustomModelInput("");
      setCustomApiKeyInput("");
      setCustomSetActiveCheck(true);
    }
    setShowKey(false);
    setCustomDialogOpen(true);
  };

  const handleSaveCustomProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = customNameInput.trim();
    const baseUrl = customBaseUrlInput.trim();
    const model = customModelInput.trim();

    if (!name) {
      toast.error("Nom requis", { description: "Donnez un nom unique à ce serveur privé." });
      return;
    }
    if (!baseUrl) {
      toast.error("URL requise", { description: "Indiquez l'URL de base (ex: http://vllm.entreprise.com/v1)." });
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
            customName: name,
            baseUrl,
            model: model || "default",
            apiKey: customApiKeyInput.trim() || undefined,
            setActive: customSetActiveCheck,
          }),
        }
      );

      setData(res.config);
      setCustomDialogOpen(false);
      toast.success(`Serveur ${name} enregistré avec succès`, {
        description: customSetActiveCheck
          ? "Défini comme modèle par défaut pour tous vos experts."
          : "Configuration sauvegardée.",
      });
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement", { description: err?.message || "Impossible de configurer le serveur." });
    } finally {
      setCustomSubmitting(false);
    }
  };

  const handleSetCustomAsDefault = async (cp: CustomProviderInfo) => {
    try {
      setLoading(true);
      const res = await apiFetch<{ success: boolean; config: ModelSettingsResponse }>(
        `/api/agents/${agentId}/modeles`,
        {
          method: "POST",
          body: JSON.stringify({
            providerId: `custom:${cp.name}`,
            customName: cp.name,
            baseUrl: cp.baseUrl,
            model: cp.model,
            setActive: true,
          }),
        }
      );
      setData(res.config);
      toast.success(`${cp.name} est maintenant le modèle par défaut`);
    } catch (err: any) {
      toast.error("Erreur lors de l'activation", { description: err?.message });
    } finally {
      setLoading(false);
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
      toast.success("Fournisseur réinitialisé avec succès");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression", { description: err?.message });
    }
  };

  const activeCustomProvider = data?.customProviders?.find((cp) => cp.isActive);
  const activeStandardProvider = data?.providers?.find((p) => p.isActive);

  // Search filter
  const filteredProviders = useMemo(() => {
    if (!data?.providers) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return data.providers;

    return data.providers.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchModels = p.models.some((m) => m.toLowerCase().includes(q));
      return matchName || matchId || matchDesc || matchModels;
    });
  }, [data?.providers, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-[15px] text-ink-2">
            Connectez vos modèles d&apos;intelligence artificielle (BYOK) : par Clé API, OAuth ou serveur local.
          </p>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 mt-0.5">
            <Bot className="h-4 w-4" />
            {data?.providers.length || 19} fournisseurs reconnus nativement par Hermes
          </span>
        </div>
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
                  : activeCustomProvider
                  ? `${activeCustomProvider.name} (Serveur privé : ${activeCustomProvider.model || "défaut"})`
                  : activeStandardProvider
                  ? `${activeStandardProvider.name} (${
                      activeStandardProvider.authMethod === "oauth" ? "OAuth / Compte" : "Votre clé API"
                    })`
                  : data.activeProvider}
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

      {/* Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-3" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un modèle ou fournisseur (ex: Claude, Ollama, GPT, Gemini...)"
            className="pl-10 pr-9 text-xs h-10 rounded-full border-line bg-surface shadow-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink-3 shrink-0">
          {searchQuery ? (
            <span>
              {filteredProviders.length} résultat{filteredProviders.length > 1 ? "s" : ""}
            </span>
          ) : (
            <span>{data?.providers.length || 19} fournisseurs disponibles</span>
          )}
        </div>
      </div>

      {/* Private Endpoints section if any exist */}
      {data?.customProviders && data.customProviders.length > 0 && !searchQuery && (
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3 flex items-center gap-2">
            <Server className="h-3.5 w-3.5 text-brand" />
            Serveurs et Endpoints privés configurés ({data.customProviders.length})
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.customProviders.map((cp) => (
              <div
                key={cp.name}
                className={cn(
                  "flex min-h-[76px] items-center gap-3 rounded-[22px] border border-line bg-surface py-3 pl-4 pr-3 transition-colors",
                  cp.isActive && "ring-1 ring-brand/30 border-brand/40"
                )}
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-brand/20 bg-brand-pale/50 text-brand font-bold text-sm select-none">
                  <Server className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="truncate text-[15px] font-semibold text-ink">{cp.name}</p>
                    {cp.isActive && (
                      <span className="inline-flex items-center rounded-full bg-brand-pale px-2 py-0.5 text-[10px] font-semibold text-brand shrink-0">
                        Actif
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full bg-soft px-1.5 py-0.2 text-[10px] font-medium text-ink-3 shrink-0">
                      Privé
                    </span>
                  </div>
                  <p className="truncate text-[12px] text-ink-3 font-mono">
                    {cp.baseUrl} • {cp.model || "défaut"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full bg-ok-pale px-2.5 py-1 text-xs font-semibold text-ok">
                    <Check className="h-3.5 w-3.5" />
                    Connecté
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label={`Options pour ${cp.name}`}
                        className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-ink"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                      <DropdownMenuItem
                        onClick={() => handleOpenCustomModal(cp)}
                        className="gap-2 text-xs"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Modifier la configuration
                      </DropdownMenuItem>
                      {!cp.isActive && (
                        <DropdownMenuItem
                          onClick={() => handleSetCustomAsDefault(cp)}
                          className="gap-2 text-xs font-medium text-brand focus:text-brand"
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Définir par défaut
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteTarget(`custom:${cp.name}`);
                          setDeleteName(cp.name);
                        }}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Providers Grid */}
      <div className="space-y-3">
        {loading && !data ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-[76px] animate-pulse rounded-[22px] border border-line bg-soft" />
            ))}
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-line bg-surface p-8 text-center space-y-3">
            <p className="text-sm text-ink-2">
              Aucun fournisseur correspondant à « <strong>{searchQuery}</strong> ».
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
                className="text-xs rounded-full"
              >
                Effacer la recherche
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setCustomNameInput(searchQuery);
                  handleOpenCustomModal();
                }}
                className="text-xs rounded-full gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Configurer comme endpoint privé
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                className={cn(
                  "flex min-h-[76px] items-center gap-3 rounded-[22px] border border-line bg-surface py-3 pl-4 pr-3 transition-colors",
                  provider.isActive && "ring-1 ring-brand/30 border-brand/40"
                )}
              >
                <ProviderLogo id={provider.id} name={provider.name} />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="truncate text-[15px] font-semibold text-ink">{provider.name}</p>
                    {provider.isActive && (
                      <span className="inline-flex items-center rounded-full bg-brand-pale px-2 py-0.5 text-[10px] font-semibold text-brand shrink-0">
                        Actif
                      </span>
                    )}
                    {provider.supportsOAuth ? (
                      <span className="inline-flex items-center rounded-full bg-soft px-1.5 py-0.2 text-[10px] font-medium text-ink-3 shrink-0">
                        Clé & OAuth
                      </span>
                    ) : provider.isLocal ? (
                      <span className="inline-flex items-center rounded-full bg-soft px-1.5 py-0.2 text-[10px] font-medium text-ink-3 shrink-0">
                        Local
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-soft px-1.5 py-0.2 text-[10px] font-medium text-ink-3 shrink-0">
                        Clé API
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[13px] text-ink-3">
                    {provider.isConfigured
                      ? `${provider.authMethod === "oauth" ? "Connecté via OAuth / Compte" : provider.maskedKey}`
                      : provider.description}
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
                            Modifier les accès
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
                            Déconnecter
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

            {/* Single dedicated card for private custom endpoints */}
            {!searchQuery && (
              <button
                type="button"
                onClick={() => handleOpenCustomModal()}
                className="flex min-h-[76px] items-center gap-3 rounded-[22px] border border-dashed border-line bg-surface/40 hover:bg-soft/70 hover:border-brand/40 py-3 pl-4 pr-3 transition-all text-left group"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] border border-line bg-soft text-ink-3 group-hover:text-brand group-hover:border-brand/30 transition-colors">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-ink group-hover:text-brand transition-colors">
                    Endpoint ou Serveur privé
                  </p>
                  <p className="text-[12px] text-ink-3 truncate">
                    Connecter un cluster vLLM, LiteLLM ou une URL d&apos;API privée
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Connection Dialog supporting both API Key and OAuth options */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">
                Connecter {selectedProvider?.name}
              </DialogTitle>
              <DialogDescription className="text-ink-3 text-xs">
                {selectedProvider?.isLocal
                  ? "Configurez l'adresse de votre serveur local compatible OpenAI."
                  : "Choisissez votre méthode de connexion pour ce fournisseur."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Auth Mode Switcher if provider supports multiple options */}
              {selectedProvider?.supportsOAuth ? (
                <div className="grid grid-cols-2 p-1 bg-soft rounded-xl border border-line">
                  <button
                    type="button"
                    onClick={() => setAuthTab("api_key")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      authTab === "api_key"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <Key className="h-3.5 w-3.5" />
                    {selectedProvider.id === "ollama" ? "Ollama Local" : "Clé API"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthTab("oauth")}
                    className={cn(
                      "flex items-center justify-center gap-2 py-1.5 text-xs font-semibold rounded-lg transition-all",
                      authTab === "oauth"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-3 hover:text-ink"
                    )}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    {selectedProvider.oauthLabel || "Connexion OAuth"}
                  </button>
                </div>
              ) : selectedProvider?.isLocal ? (
                <div className="flex items-center gap-2.5 rounded-xl border border-line bg-soft/50 p-3 text-xs text-ink-3">
                  <Server className="h-4 w-4 shrink-0 text-brand" />
                  <span>
                    Serveur local compatible OpenAI. Assurez-vous que l&apos;application est lancée sur votre machine.
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-xl border border-line bg-soft/50 p-3 text-xs text-ink-3">
                  <Key className="h-4 w-4 shrink-0 text-brand" />
                  <span>
                    Ce fournisseur s&apos;intègre via sa <strong>Clé API directe</strong> (recommandée et standard pour les agents autonomes en production).
                  </span>
                </div>
              )}

              {/* Local URL and model inputs for Ollama / LM Studio */}
              {selectedProvider?.isLocal && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="providerBaseUrl" className="text-xs font-semibold text-ink">
                      URL locale du serveur
                    </Label>
                    <Input
                      id="providerBaseUrl"
                      value={customBaseUrlInputForProvider}
                      onChange={(e) => setCustomBaseUrlInputForProvider(e.target.value)}
                      placeholder={selectedProvider.defaultBaseUrl}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="providerModel" className="text-xs font-semibold text-ink">
                      Modèle par défaut
                    </Label>
                    <Input
                      id="providerModel"
                      value={customModelInputForProvider}
                      onChange={(e) => setCustomModelInputForProvider(e.target.value)}
                      placeholder={selectedProvider.defaultModel}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              )}

              {/* API Key Form */}
              {authTab === "api_key" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-xs font-semibold text-ink">
                      Clé API {selectedProvider?.name} {selectedProvider?.isLocal && "(Optionnelle en local)"}
                    </Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showKey ? "text" : "password"}
                        placeholder={
                          selectedProvider?.isConfigured
                            ? "Laisser vide pour conserver la clé actuelle"
                            : selectedProvider?.isLocal
                            ? "Laisser vide pour exécuter sans clé d'authentification"
                            : `Collez votre clé API (ex: ${selectedProvider?.placeholderKey})`
                        }
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        className="font-mono text-xs pr-10"
                        autoFocus={!selectedProvider?.isLocal}
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
                </div>
              )}

              {/* OAuth Form */}
              {authTab === "oauth" && selectedProvider?.supportsOAuth && (
                <div className="space-y-3">
                  {selectedProvider.id === "openrouter" ? (
                    <div className="rounded-2xl border border-brand/20 bg-brand-pale/30 p-4 space-y-3 text-center">
                      <div className="grid h-10 w-10 mx-auto place-items-center rounded-full bg-brand-pale text-brand">
                        <Zap className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-ink">Connexion instantanée OpenRouter</h4>
                        <p className="text-[11px] text-ink-3 mt-1">
                          Autorisez Yelema à accéder à votre compte OpenRouter. Une clé dédiée sécurisée sera générée automatiquement via PKCE.
                        </p>
                      </div>

                      <Button
                        type="button"
                        onClick={handleStartOpenRouterOAuth}
                        disabled={oauthRedirecting}
                        className="w-full gap-2 text-xs font-semibold rounded-full"
                      >
                        {oauthRedirecting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Redirection vers OpenRouter...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="h-3.5 w-3.5" />
                            Se connecter avec OpenRouter
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedProvider.oauthWarning && (
                        <div className="flex gap-2.5 rounded-xl border border-warning/30 bg-warning-pale/20 p-3 text-xs text-ink-2">
                          <AlertCircle className="h-4 w-4 shrink-0 text-warning mt-0.5" />
                          <p className="text-[11px] leading-relaxed">
                            {selectedProvider.oauthWarning}
                          </p>
                        </div>
                      )}

                      {selectedProvider.oauthNotice && !selectedProvider.oauthWarning && (
                        <div className="flex gap-2.5 rounded-xl border border-brand/20 bg-brand-pale/20 p-3 text-xs text-ink-2">
                          <Zap className="h-4 w-4 shrink-0 text-brand mt-0.5" />
                          <p className="text-[11px] leading-relaxed">
                            {selectedProvider.oauthNotice}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="oauthToken" className="text-xs font-semibold text-ink">
                          {selectedProvider.id === "gemini"
                            ? "Jeton d'accès OAuth2 / Credentials Google Cloud (Vertex AI)"
                            : selectedProvider.id === "openai"
                            ? "Jeton de session ChatGPT / Codex OAuth"
                            : selectedProvider.id === "anthropic"
                            ? "Jeton Claude Code OAuth (sk-ant-oat01-...)"
                            : selectedProvider.id === "ollama"
                            ? "Clé API Ollama Cloud (OLLAMA_API_KEY)"
                            : `Jeton OAuth (${selectedProvider.name})`}
                        </Label>
                        <div className="relative">
                          <Input
                            id="oauthToken"
                            type={showKey ? "text" : "password"}
                            placeholder={
                              selectedProvider.id === "anthropic"
                                ? "Collez votre token Claude Code (setup-token)"
                                : selectedProvider.id === "gemini"
                                ? "Collez votre Bearer token Vertex AI ou JSON de compte de service"
                                : selectedProvider.id === "openai"
                                ? "Collez votre jeton de session ChatGPT / Codex"
                                : selectedProvider.id === "ollama"
                                ? "Collez votre clé API Ollama Cloud"
                                : "Collez votre token d'authentification OAuth"
                            }
                            value={oauthTokenInput}
                            onChange={(e) => setOauthTokenInput(e.target.value)}
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
                    </div>
                  )}
                </div>
              )}

              {/* Default Model Checkbox */}
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
                disabled={submitting || oauthRedirecting}
              >
                Annuler
              </Button>
              {!(authTab === "oauth" && selectedProvider?.id === "openrouter") && (
                <Button type="submit" disabled={submitting || oauthRedirecting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog for Private Custom Endpoints */}
      <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveCustomProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">
                <Server className="h-5 w-5 text-brand" />
                {editingCustom ? `Modifier ${editingCustom.name}` : "Endpoint ou Serveur privé"}
              </DialogTitle>
              <DialogDescription className="text-ink-3 text-xs">
                Connectez n&apos;importe quel cluster vLLM, LiteLLM, ou endpoint d&apos;inférence privé compatible OpenAI.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-3">
              <div className="space-y-1.5">
                <Label htmlFor="customName" className="text-xs font-semibold text-ink">
                  Nom du serveur / Libellé *
                </Label>
                <Input
                  id="customName"
                  placeholder="ex: vLLM Cluster Entreprise, Mon Serveur Local"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  disabled={Boolean(editingCustom)}
                  className="text-xs"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customBaseUrl" className="text-xs font-semibold text-ink">
                  URL de base de l&apos;API (Base URL) *
                </Label>
                <Input
                  id="customBaseUrl"
                  placeholder="ex: http://vllm.entreprise.lan:8000/v1"
                  value={customBaseUrlInput}
                  onChange={(e) => setCustomBaseUrlInput(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-ink-3">
                  Doit pointer vers la racine d&apos;un endpoint compatible OpenAI (/v1).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customModel" className="text-xs font-semibold text-ink">
                  Identifiant du modèle (Optionnel)
                </Label>
                <Input
                  id="customModel"
                  placeholder="ex: meta-llama/Llama-3.3-70B-Instruct, custom-model"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="customApiKey" className="text-xs font-semibold text-ink">
                  Clé d&apos;authentification (Optionnelle si réseau interne)
                </Label>
                <div className="relative">
                  <Input
                    id="customApiKey"
                    type={showKey ? "text" : "password"}
                    placeholder={
                      editingCustom?.hasKey
                        ? "Laisser vide pour conserver la clé actuelle"
                        : "Collez le token ou la clé si le serveur l'exige"
                    }
                    value={customApiKeyInput}
                    onChange={(e) => setCustomApiKeyInput(e.target.value)}
                    className="font-mono text-xs pr-10"
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
                  id="customSetActiveCheck"
                  checked={customSetActiveCheck}
                  onChange={(e) => setCustomSetActiveCheck(e.target.checked)}
                  className="rounded border-line text-brand focus:ring-brand h-4 w-4"
                />
                <Label htmlFor="customSetActiveCheck" className="text-xs text-ink-2 cursor-pointer select-none">
                  Définir comme modèle par défaut pour tous les experts
                </Label>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCustomDialogOpen(false)}
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
                  "Enregistrer le serveur"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Supprimer ${deleteName} ?`}
        description="Ce fournisseur sera supprimé de la configuration de l'agent. Si ce modèle était actif, l'agent repassera automatiquement sur le modèle inclus Yelema Starter."
        confirmText="Supprimer"
        destructive={true}
        onConfirm={handleDeleteProviderKey}
      />
    </div>
  );
}
