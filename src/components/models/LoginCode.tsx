"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { safeVerificationUrl } from "@/lib/llm";
import type { LlmAccount } from "@/lib/llm-accounts";

const POLL_MS = 5_000;

// Une connexion en attente : l'adresse à ouvrir et le code à y saisir, avec le compte à ajouter. Le
// back-office est relu jusqu'à l'approbation ; `onDone` est appelé quand elle aboutit ou échoue.
export function LoginCode({ account, onDone, compact }: { account: LlmAccount; onDone: () => Promise<void>; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const url = safeVerificationUrl(account.login?.verificationUrl);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      // Hidden: nothing is asked until the tab shows again.
      if (document.hidden) return void (timer = setTimeout(tick, POLL_MS));
      try {
        const next = await apiFetch<LlmAccount>(`/api/llm/accounts/${account.id}`);
        if (next.state === "active") toast.success("Compte connecté", { description: "L’installation sur l’instance est en cours." });
        if (next.state === "failed") toast.error("La connexion n’a pas abouti (refusée ou code expiré). Relancez-la.");
        if (next.state !== "pending") return void (await onDone());
      } catch {
        // Un échec de lecture ne fait pas perdre la connexion : on relit au tour suivant.
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS);
    };
    let timer = setTimeout(tick, POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [account.id, onDone]);

  if (!account.login || !url) return null;
  const copy = async () => {
    await navigator.clipboard.writeText(account.login!.userCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div role="status" className={compact ? "flex flex-wrap items-center gap-2 text-xs" : "space-y-3 py-2 text-center"}>
      {!compact && <p className="text-xs text-ink-3">Ouvrez la page du fournisseur, connectez-vous avec le compte à ajouter et saisissez ce code :</p>}
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-soft px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-ink">
        {account.login.userCode}
        <button type="button" aria-label="Copier le code" onClick={() => void copy()} className="text-ink-3 hover:text-ink">
          {copied ? <Check className="h-3.5 w-3.5 text-ok" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
        Ouvrir la page <ExternalLink className="h-3 w-3" />
      </a>
      <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
        <Loader2 className="h-3 w-3 animate-spin" /> En attente d’approbation…
      </span>
    </div>
  );
}
