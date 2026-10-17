"use client";

import { useState } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import type { LlmYelema } from "@/lib/llm";

// Bloc 3, replié : ce que le moteur Yelema offre, inclus dans l'abonnement et sans clé.
export function YelemaEngine({ yelema }: { yelema: LlmYelema }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-[22px] border border-line bg-surface p-4 sm:p-5">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left">
        <Sparkles className="h-4 w-4 shrink-0 text-brand" />
        <span className="flex-1 text-xs font-bold uppercase tracking-wider text-ink-3">Moteur Yelema</span>
        <span className="text-[11px] text-ink-3">{yelema.models.length} modèle{yelema.models.length > 1 ? "s" : ""} offert{yelema.models.length > 1 ? "s" : ""}</span>
        <ChevronRight className={`h-4 w-4 text-ink-3 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-ink-3">Inclus dans l’abonnement, sans clé à fournir. Il sert quand aucun compte n’est branché, et en dernier recours derrière vos comptes.</p>
          <ul className="divide-y divide-line rounded-2xl border border-line">
            {yelema.models.map((m) => (
              <li key={m.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <span className="min-w-0 flex-1 truncate text-ink">{m.label}</span>
                {m.id === yelema.default && <span className="rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-brand-ink">Par défaut</span>}
                <span className="max-w-[45%] truncate font-mono text-[10px] text-ink-3">{m.id}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
