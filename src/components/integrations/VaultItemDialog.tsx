"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IDENTIFIER_TYPES, type IdentifierType, type VaultDraft } from "@/lib/vault";
import { cn } from "@/lib/utils";

const EMPTY: VaultDraft = { label: "", origin: "", identifierType: "email", identifier: "", password: "", purpose: "" };
const PLACEHOLDER: Record<IdentifierType, string> = { email: "rh@entreprise.ci", username: "acme-tresorerie", phone: "+225 07 00 00 00 00" };

// Ajout d'une connexion : ce que demande `hermes vault add`, plus une description pour l'expert. Pas de
// 2FA. Le brouillon part au back-office ; un dialogue refermé repart vide (le mot de passe ne reste pas).
export function VaultItemDialog({ open, onOpenChange, expertName, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; expertName: string; onSave: (draft: VaultDraft) => Promise<void> }) {
  const [draft, setDraft] = useState<VaultDraft>(EMPTY);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) setDraft(EMPTY);
  }, [open]);
  const set = <K extends keyof VaultDraft>(k: K, v: VaultDraft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const ready = Boolean(draft.label.trim() && draft.origin.trim() && draft.identifier.trim() && draft.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      await onSave(draft);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Confier une connexion à {expertName}</DialogTitle>
            <DialogDescription>{expertName} pourra se connecter à ce site sans jamais voir le mot de passe.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="v-label">Libellé</Label>
              <Input id="v-label" value={draft.label} maxLength={80} placeholder="Portail CNPS" onChange={(e) => set("label", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-origin">Lien du site</Label>
              <Input id="v-origin" type="url" inputMode="url" value={draft.origin} placeholder="https://e.cnps.ci/login" onChange={(e) => set("origin", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Identifiant</Label>
            <div role="radiogroup" className="flex gap-1 rounded-xl bg-soft p-1">
              {IDENTIFIER_TYPES.map((t) => (
                <button key={t.value} type="button" role="radio" aria-checked={draft.identifierType === t.value} onClick={() => set("identifierType", t.value)} className={cn("flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold", draft.identifierType === t.value ? "bg-surface text-ink shadow-sm" : "text-ink-2")}>
                  {t.label}
                </button>
              ))}
            </div>
            <Input aria-label="Valeur de l’identifiant" value={draft.identifier} maxLength={254} autoComplete="off" placeholder={PLACEHOLDER[draft.identifierType]} onChange={(e) => set("identifier", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-password">Mot de passe</Label>
            <Input id="v-password" type="password" value={draft.password} maxLength={1024} autoComplete="new-password" onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-purpose">À quoi sert cette connexion</Label>
            <textarea id="v-purpose" value={draft.purpose} maxLength={300} rows={3} placeholder="Déclarer les salariés à la CNPS chaque mois" onChange={(e) => set("purpose", e.target.value)} className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-brand" />
            <p className="text-xs text-ink-3">{expertName} lit cette description pour savoir quand utiliser cette connexion.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!ready || busy}>
              {busy && <Loader2 className="animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
          {busy && <p className="text-xs text-ink-3">Si l’instance est en veille, son réveil prend quelques secondes.</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
