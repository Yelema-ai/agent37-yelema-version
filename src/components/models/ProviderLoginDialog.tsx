"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { LlmLogin, LlmLoginView } from "@/lib/llm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SAVE_WARNING } from "./ProviderDialog";

const POLL_MS = 5_000;
const ENDED: Record<string, string> = {
  denied: "La connexion a été refusée chez le fournisseur.",
  expired: "Le code a expiré avant d’être saisi. Relancez la connexion.",
  error: "La connexion n’a pas abouti. Relancez-la.",
  none: "La connexion n’a pas abouti. Relancez-la.",
};

// L'onglet « OAuth / Compte » d'origine : connecter un abonnement chez un fournisseur de modèles à
// la place d'une clé API. Rien n'est collé ici : le titulaire du compte ouvre la page du
// fournisseur et y saisit le code affiché ; les jetons restent dans l'instance. `url` est la route
// de la portée (soi-même, ou un membre désigné par un administrateur).
export function ProviderLoginDialog({ provider, url, scopeLabel, onApproved, onClose }: { provider: LlmLogin | null; url: string; scopeLabel: string; onApproved: () => Promise<void>; onClose: () => void }) {
  const [model, setModel] = useState("");
  const [login, setLogin] = useState<LlmLoginView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setModel("");
    setLogin(null);
    setError(null);
  }, [provider]);

  // Tant que le fournisseur attend le code, l'état est relu ; approuvé, l'écran se met à jour seul.
  useEffect(() => {
    if (!provider || login?.status !== "pending") return;
    const timer = setTimeout(async () => {
      try {
        const next = await apiFetch<LlmLoginView>(url);
        if (next.status === "approved") {
          await onApproved();
          toast.success(`${provider.label} connecté avec succès`, { description: "L’installation sur l’instance est en cours." });
          onClose();
        } else if (next.status === "pending") setLogin(next);
        else {
          setLogin(null);
          setError(ENDED[next.status] ?? ENDED.error);
        }
      } catch (e) {
        setLogin(null);
        setError((e as Error).message);
      }
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [provider, login, url, onApproved, onClose]);

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!provider) return;
    if (!model.trim()) return setError("Indiquez le modèle que vos experts utiliseront.");
    setBusy(true);
    setError(null);
    try {
      const started = await apiFetch<LlmLoginView>(url, { method: "POST", body: JSON.stringify({ provider: provider.id, model: model.trim() }) });
      if (started.status === "pending") setLogin(started);
      else setError(ENDED.error);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={provider !== null} onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={start}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-ink">Connecter {provider?.label}</DialogTitle>
            <DialogDescription className="text-xs text-ink-3">Pour {scopeLabel}. Le compte reste le vôtre : aucun mot de passe ni jeton n’est saisi ici.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {login?.status === "pending" && login.verificationUrl ? (
              <div className="space-y-3 rounded-2xl border border-brand/20 bg-tint/40 p-4 text-center">
                <p className="text-xs text-ink-2">Ouvrez la page du fournisseur avec le compte de l’abonnement, puis saisissez ce code :</p>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(login.userCode ?? "").then(() => toast.success("Code copié"))}
                  className="mx-auto flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 font-mono text-lg font-bold tracking-widest text-ink"
                >
                  {login.userCode}
                  <Copy className="h-4 w-4 text-ink-3" />
                </button>
                <Button asChild className="w-full gap-2 rounded-full text-xs font-semibold">
                  <a href={login.verificationUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Ouvrir la page du fournisseur
                  </a>
                </Button>
                <p className="flex items-center justify-center gap-2 text-[11px] text-ink-3">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  En attente de votre approbation…
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="text-[11px] leading-relaxed">Un abonnement est prévu pour un usage individuel : vérifiez que les conditions de votre fournisseur permettent d’y faire tourner des agents. Pour une équipe, préférez une clé API.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-model" className="text-xs font-semibold text-ink">
                    Modèle par défaut
                  </Label>
                  <Input id="login-model" autoComplete="off" spellCheck={false} placeholder="Identifiant du modèle chez ce fournisseur" value={model} onChange={(e) => setModel(e.target.value)} className="font-mono text-xs" autoFocus />
                </div>
                <p className="text-[11px] leading-relaxed text-ink-3">{SAVE_WARNING}</p>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-ko-pale px-3 py-2 text-xs text-ko">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {login ? "Fermer" : "Annuler"}
            </Button>
            {!login && (
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <Check className="mr-1.5 h-4 w-4" />
                    Obtenir le code
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
