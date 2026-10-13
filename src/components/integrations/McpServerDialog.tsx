"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Globe, Key, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { McpAuth, McpServerDraft } from "@/lib/mcp-servers";
import { cn } from "@/lib/utils";

// Deux méthodes seulement : un serveur ouvert, ou un jeton Bearer. OAuth 2.0 n'est pas proposé.
const AUTH_OPTIONS: { value: McpAuth; label: string; description: string; icon: typeof Globe }[] = [
  { value: "none", label: "Aucune", description: "Serveur public ou sans clé d’autorisation", icon: Globe },
  { value: "bearer", label: "Jeton Bearer", description: "Clé secrète ou jeton d’accès, envoyé dans l’en-tête Authorization", icon: Key },
];

// Le dialogue d'ajout d'un serveur MCP. Il ne garde rien : le brouillon part au back-office, qui
// contrôle le nom, l'adresse et le jeton, et dont le refus revient ici en une phrase.
export function McpServerDialog({ open, onOpenChange, scopeLabel, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; scopeLabel: string; onSave: (draft: McpServerDraft) => Promise<void> }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState<McpAuth>("none");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);

  // Un dialogue rouvert repart vide : un jeton saisi puis abandonné ne reste pas dans la page.
  useEffect(() => {
    if (open) return;
    setName("");
    setUrl("");
    setAuth("none");
    setToken("");
  }, [open]);

  const current = AUTH_OPTIONS.find((o) => o.value === auth) ?? AUTH_OPTIONS[0];
  const CurrentIcon = current.icon;
  const ready = Boolean(name.trim() && url.trim() && (auth === "none" || token.trim()));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    try {
      await onSave({ name: name.trim(), url: url.trim(), auth, ...(auth === "bearer" ? { token: token.trim() } : {}) });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Connecter un serveur MCP</DialogTitle>
            <DialogDescription>Branchez un serveur Model Context Protocol pour {scopeLabel}.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="mcp-name">
                Nom du serveur <span className="text-ko">*</span>
              </Label>
              <Input id="mcp-name" type="text" placeholder="ex. mon_crm" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} required autoFocus autoComplete="off" spellCheck={false} />
              <p className="text-xs text-ink-3">Des minuscules, des chiffres ou « _ », sans espace ni tiret. Vos experts retrouvent ses outils sous ce nom.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mcp-url">
                Adresse du serveur <span className="text-ko">*</span>
              </Label>
              <Input id="mcp-url" type="url" placeholder="https://exemple.com/mcp" value={url} onChange={(e) => setUrl(e.target.value)} disabled={busy} required autoComplete="off" spellCheck={false} className="font-mono text-[13px]" />
              <p className="text-xs text-ink-3">En https, joignable depuis Internet : vos experts tournent dans le cloud, pas sur votre réseau.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mcp-auth">Authentification</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    id="mcp-auth"
                    type="button"
                    disabled={busy}
                    className="flex h-11 w-full items-center justify-between rounded-xl border border-line bg-surface px-3.5 py-2 text-[14px] text-ink transition-colors hover:border-brand/40 focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-soft-2 text-brand">
                        <CurrentIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate font-medium">{current.label}</span>
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-12px_rgba(23,17,43,.25)]">
                  {AUTH_OPTIONS.map((opt) => {
                    const selected = auth === opt.value;
                    const Icon = opt.icon;
                    return (
                      <DropdownMenuItem key={opt.value} onSelect={() => setAuth(opt.value)} className={cn("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors", selected ? "bg-tint/80 text-brand" : "text-ink hover:bg-soft")}>
                        <span className="flex min-w-0 items-start gap-2.5">
                          <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors", selected ? "bg-brand text-on-brand" : "bg-soft-2 text-ink-2")}>
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-tight">{opt.label}</span>
                            <span className="mt-0.5 block text-xs leading-snug text-ink-3">{opt.description}</span>
                          </span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0 stroke-[2.5] text-brand" />}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {auth === "bearer" && (
              <div className="space-y-1.5 pt-1">
                <Label htmlFor="mcp-token">
                  Jeton Bearer <span className="text-ko">*</span>
                </Label>
                <Input id="mcp-token" type="password" placeholder="Jeton ou clé secrète" value={token} onChange={(e) => setToken(e.target.value)} disabled={busy} required autoComplete="off" spellCheck={false} />
                <p className="text-xs text-ink-3">Chiffré et gardé par Yelema ; il ne sera plus affiché, seulement ses quatre derniers caractères.</p>
              </div>
            )}

            <p className="rounded-xl bg-soft px-3 py-2.5 text-xs leading-relaxed text-ink-2">
              Les outils de ce serveur seront offerts à tous les experts concernés ; Yelema ne les vérifie pas. La conversation en cours sera interrompue le temps de l’installation.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" disabled={busy || !ready}>
              {busy ? <Loader2 className="animate-spin" /> : <Plus />}
              {busy ? "Connexion…" : "Connecter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
