"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Server } from "lucide-react";
import { CUSTOM_PROVIDER, type LlmKey, type LlmKeyDraft } from "@/lib/llm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SAVE_WARNING } from "./ProviderDialog";

// Le dialogue d'un endpoint privé compatible OpenAI (vLLM, LiteLLM…) : un par portée. L'instance du
// membre est dans le cloud : l'adresse doit être en https et joignable depuis Internet, ce que le
// back-office contrôle. Sa clé, s'il en demande une, n'est pas vérifiée à l'avance.
export function CustomEndpointDialog({ open, current, onSubmit, onClose }: { open: boolean; current: LlmKey | null; onSubmit: (draft: LlmKeyDraft) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [secret, setSecret] = useState("");
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(current?.name ?? "");
    setBaseUrl(current?.baseUrl ?? "");
    setModel(current?.model ?? "");
    setSecret("");
    setShown(false);
    setError(null);
  }, [open, current]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return setError("Donnez un nom à ce serveur privé.");
    if (!baseUrl.trim()) return setError("Indiquez l’adresse de base de l’API (ex: https://llm.entreprise.com/v1).");
    if (!model.trim()) return setError("Indiquez l’identifiant du modèle que vos experts utiliseront.");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ provider: CUSTOM_PROVIDER, name: name.trim(), baseUrl: baseUrl.trim(), model: model.trim(), ...(secret.trim() ? { secret: secret.trim() } : {}) });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg text-ink">
              <Server className="h-5 w-5 text-brand" />
              {current ? `Modifier ${current.name ?? "l’endpoint"}` : "Endpoint ou Serveur privé"}
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-3">Connectez n’importe quel cluster vLLM, LiteLLM, ou endpoint d’inférence privé compatible OpenAI.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="custom-name" className="text-xs font-semibold text-ink">
                Nom du serveur / Libellé *
              </Label>
              <Input id="custom-name" placeholder="ex: vllm-entreprise" value={name} onChange={(e) => setName(e.target.value)} className="text-xs" autoComplete="off" autoFocus />
              <p className="text-[11px] text-ink-3">Lettres, chiffres et tirets, sans espace.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-url" className="text-xs font-semibold text-ink">
                URL de base de l’API (Base URL) *
              </Label>
              <Input id="custom-url" placeholder="ex: https://llm.entreprise.com/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} className="font-mono text-xs" autoComplete="off" spellCheck={false} />
              <p className="text-[11px] text-ink-3">Doit pointer vers la racine d’un endpoint compatible OpenAI (/v1), en https et joignable depuis Internet : vos experts tournent dans le cloud, pas sur votre réseau.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-model" className="text-xs font-semibold text-ink">
                Identifiant du modèle *
              </Label>
              <Input id="custom-model" placeholder="ex: meta-llama/Llama-3.3-70B-Instruct" value={model} onChange={(e) => setModel(e.target.value)} className="font-mono text-xs" autoComplete="off" spellCheck={false} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="custom-key" className="text-xs font-semibold text-ink">
                Clé d’authentification (optionnelle)
              </Label>
              <div className="relative">
                <Input
                  id="custom-key"
                  type={shown ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={current?.hint ? "Laisser vide pour conserver la clé actuelle" : "Collez le token ou la clé si le serveur l’exige"}
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  className="pr-10 font-mono text-xs"
                />
                <button type="button" aria-label={shown ? "Masquer la clé" : "Afficher la clé"} onClick={() => setShown(!shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink">
                  {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-ink-3">Yelema n’appelle pas votre serveur : la clé n’est pas vérifiée avant d’être enregistrée.</p>
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
                "Enregistrer le serveur"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
