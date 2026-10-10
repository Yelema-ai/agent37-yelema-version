"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Bot,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Layers,
  Loader2,
  Lock,
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
      case "mistral":
        return { bg: "bg-[#EA580C]/10 text-[#EA580C] border-[#EA580C]/20", label: "M" };
      case "groq":
        return { bg: "bg-[#F43F5E]/10 text-[#F43F5E] border-[#F43F5E]/20", label: "Gq" };
      case "xai":
        return { bg: "bg-ink/10 text-ink border-ink/20", label: "𝕏" };
      case "nous":
        return { bg: "bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20", label: "NP" };
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

  // Dialog state for connecting / editing a provider
  const [configOpen, setConfigOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderStatus | null>(null);
  const [authTab, setAuthTab] = useState<"api_key" | "oauth">("api_key");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [oauthTokenInput, setOauthTokenInput] = useState("");
  const [setActiveCheck, setSetActiveCheck] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthRedirecting, setOauthRedirecting] = useState(false);

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
        // Exchange code with OpenRouter via backend
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

            // Clean the query string without reloading page
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
    // Default to API key tab, or OAuth if provider only has OAuth
    setAuthTab(provider.authMethod === "oauth" ? "oauth" : "api_key");
    setApiKeyInput("");
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
      if (!selectedProvider.isConfigured && !apiKeyInput.trim()) {
        toast.error("Clé API requise", {
          description: "Veuillez saisir votre clé API pour ce fournisseur.",
        });
        return;
      }
    } else {
      // OAuth tab save for token-based providers
      if (selectedProvider.id === "openrouter") {
        await handleStartOpenRouterOAuth();
        return;
      }

      if (!oauthTokenInput.trim() && !selectedProvider.isConfigured) {
        toast.error("Jeton OAuth requis", {
          description: "Veuillez saisir le jeton de session / setup-token.",
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

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1.5">
        <p className="text-[15px] text-ink-2">
          Connectez vos modèles d&apos;intelligence artificielle (BYOK) : par Clé API ou OAuth selon le fournisseur.
        </p>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
          <Bot className="h-4 w-4" />
          {data?.providers.length || 10} fournisseurs d&apos;inférence supportés
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
                  : `${data.providers.find((p) => p.isActive)?.name || data.activeProvider} (${
                      data.providers.find((p) => p.isActive)?.authMethod === "oauth" ? "OAuth" : "Votre clé API"
                    })`}
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

      {/* Providers Grid */}
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
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-soft px-1.5 py-0.2 text-[10px] font-medium text-ink-3 shrink-0">
                        Clé API
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[13px] text-ink-3">
                    {provider.isConfigured
                      ? `${provider.authMethod === "oauth" ? "Connecté via OAuth" : provider.maskedKey}`
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
          </div>
        )}
      </div>

      {/* Connection Dialog supporting both API Key and OAuth */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveProvider}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">
                Connecter {selectedProvider?.name}
              </DialogTitle>
              <DialogDescription className="text-ink-3 text-xs">
                Choisissez votre méthode de connexion pour ce fournisseur.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Auth Mode Switcher if provider supports OAuth */}
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
                    Clé API
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
                    Connexion OAuth
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-line bg-soft/50 p-3 text-xs text-ink-3">
                  <Lock className="h-4 w-4 shrink-0 text-ink-3" />
                  <span>
                    Ce fournisseur ne propose pas d&apos;OAuth pour les agents tiers. L&apos;accès s&apos;effectue uniquement par <strong>Clé API</strong>.
                  </span>
                </div>
              )}

              {/* API Key Form */}
              {authTab === "api_key" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-xs font-semibold text-ink">
                      Clé API {selectedProvider?.name}
                    </Label>
                    <div className="relative">
                      <Input
                        id="apiKey"
                        type={showKey ? "text" : "password"}
                        placeholder={
                          selectedProvider?.isConfigured
                            ? "Laisser vide pour conserver la clé actuelle"
                            : `Collez votre clé API (ex: ${selectedProvider?.placeholderKey})`
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

                      <div className="space-y-2">
                        <Label htmlFor="oauthToken" className="text-xs font-semibold text-ink">
                          Jeton OAuth / Setup-token ({selectedProvider.name})
                        </Label>
                        <div className="relative">
                          <Input
                            id="oauthToken"
                            type={showKey ? "text" : "password"}
                            placeholder={
                              selectedProvider.id === "anthropic"
                                ? "Collez votre token Claude Code (setup-token)"
                                : "Collez votre token de session OAuth"
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={`Déconnecter ${deleteName} ?`}
        description="Les accès à ce fournisseur seront supprimés de l'agent. Si ce modèle était actif, l'agent repassera automatiquement sur le modèle inclus Yelema Starter."
        confirmText="Déconnecter"
        destructive={true}
        onConfirm={handleDeleteProviderKey}
      />
    </div>
  );
}
