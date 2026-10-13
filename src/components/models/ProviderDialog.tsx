"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ExternalLink, Eye, EyeOff, Key, Loader2, Zap } from "lucide-react";
import type { LlmKey, LlmKeyDraft, LlmProvider } from "@/lib/llm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Ce que l'on dit avant d'enregistrer : la clé sert tous les experts, et la pose coupe un tour en cours. */
export const SAVE_WARNING =
  "Tous vos experts passeront par ce compte, routines et messages reçus par Telegram ou WhatsApp compris, de jour comme de nuit. La conversation en cours sera interrompue.";

// Le dialogue de connexion d'un fournisseur : sa clé, masquée tant qu'on ne demande pas à la voir,
// et le modèle par défaut. `current` est la clé déjà en place pour ce fournisseur sur cette portée :
// on peut alors n'en changer que le modèle. `onOneClick`, pour OpenRouter : l'utilisateur approuve
// chez le fournisseur, qui crée la clé ; elle ne passe jamais par ce navigateur.
export function ProviderDialog({
  provider,
  current,
  scopeLabel,
  onSubmit,
  onClose,
  onOneClick,
}: {
  provider: LlmProvider | null;
  current: LlmKey | null;
  scopeLabel: string;
  onSubmit: (draft: LlmKeyDraft) => Promise<void>;
  onClose: () => void;
  /** Mène l'utilisateur chez le fournisseur ; la page est quittée si tout va bien. */
  onOneClick?: (model: string) => Promise<void>;
}) {
  const [secret, setSecret] = useState("");
  const [model, setModel] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSecret("");
    setShown(false);
    setError(null);
    setLeaving(false);
    setModel(current?.model ?? provider?.defaultModel ?? "");
  }, [provider, current]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    if (!secret.trim() && !current) return setError("Saisissez votre clé API pour ce fournisseur.");
    if (!model.trim()) return setError("Indiquez le modèle que vos experts utiliseront.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ provider: provider.id, model: model.trim(), ...(secret.trim() ? { secret: secret.trim() } : {}) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function oneClick() {
    if (!onOneClick) return;
    if (!model.trim()) return setError("Indiquez le modèle que vos experts utiliseront.");
    setLeaving(true);
    setError(null);
    try {
      await onOneClick(model.trim());
    } catch (err) {
      setError((err as Error).message);
      setLeaving(false);
    }
  }

  return (
    <Dialog open={provider !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">Connecter {provider?.label}</DialogTitle>
            <DialogDescription className="text-xs text-ink-3">Pour {scopeLabel}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="flex items-center gap-2.5 rounded-xl border border-line bg-soft/50 p-3 text-xs text-ink-3">
              <Key className="h-4 w-4 shrink-0 text-brand" />
              <span>
                Ce fournisseur s’intègre via sa <strong>Clé API directe</strong> (recommandée et standard pour les agents autonomes en production).
              </span>
            </div>

            {provider?.notice && (
              <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-[11px] leading-relaxed">{provider.notice}</p>
              </div>
            )}

            {onOneClick && (
              <div className="space-y-3 rounded-2xl border border-brand/20 bg-tint/40 p-4 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-tint text-brand-ink">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-ink">Connexion instantanée OpenRouter</h4>
                  <p className="mt-1 text-[11px] text-ink-3">Autorisez Yelema à accéder à votre compte OpenRouter. Une clé dédiée sécurisée sera générée automatiquement via PKCE.</p>
                </div>
                <Button type="button" onClick={() => void oneClick()} disabled={leaving || busy} className="w-full gap-2 rounded-full text-xs font-semibold">
                  {leaving ? (
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
                <p className="text-[11px] text-ink-3">ou collez une clé API ci-dessous</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="llm-key" className="text-xs font-semibold text-ink">
                Clé API {provider?.label}
              </Label>
              <div className="relative">
                <Input
                  id="llm-key"
                  type={shown ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={current ? "Laisser vide pour conserver la clé actuelle" : `Collez votre clé API (ex: ${provider?.placeholder ?? ""})`}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pr-10 font-mono text-xs"
                  autoFocus
                />
                <button type="button" aria-label={shown ? "Masquer la clé" : "Afficher la clé"} onClick={() => setShown(!shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
                  {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {provider && !provider.verifiable && <p className="text-[11px] text-ink-3">Cette clé ne peut pas être vérifiée avant d’être enregistrée.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-model" className="text-xs font-semibold text-ink">
                Modèle par défaut
              </Label>
              <Input id="llm-model" autoComplete="off" spellCheck={false} placeholder={provider?.defaultModel ?? "Identifiant du modèle chez ce fournisseur"} value={model} onChange={(e) => setModel(e.target.value)} className="font-mono text-xs" />
            </div>

            <p className="text-[11px] leading-relaxed text-ink-3">{SAVE_WARNING}</p>

            {error && (
              <p role="alert" className="rounded-xl bg-ko-pale px-3 py-2 text-xs text-ko">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
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
  );
}
