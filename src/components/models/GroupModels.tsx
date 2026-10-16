"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cleanModel, MAX_FALLBACKS } from "@/lib/llm-accounts";

// Le modèle d'un fournisseur et ses modèles de secours, sur les mêmes comptes (Opus puis Sonnet).
// Une valeur s'enregistre à la sortie du champ ou sur Entrée ; une saisie invalide est rendue telle
// qu'elle était.
export function GroupModels({ model, fallbacks, onChange, disabled }: { model: string; fallbacks: string[]; onChange: (next: { model: string; fallbacks: string[] }) => void; disabled?: boolean }) {
  const [draft, setDraft] = useState(model);
  const [adding, setAdding] = useState("");

  useEffect(() => setDraft(model), [model]);

  const commitModel = () => {
    const next = cleanModel(draft);
    if (!next) return setDraft(model);
    if (next !== model) onChange({ model: next, fallbacks: fallbacks.filter((m) => m !== next) });
  };
  const addFallback = () => {
    const next = cleanModel(adding);
    setAdding("");
    if (next && next !== model && !fallbacks.includes(next)) onChange({ model, fallbacks: [...fallbacks, next] });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <label className="sr-only" htmlFor={`model-${model}`}>Modèle</label>
      <Input
        id={`model-${model}`}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitModel}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitModel())}
        spellCheck={false}
        className="h-7 w-44 rounded-full font-mono text-[11px]"
      />
      {fallbacks.map((m, i) => (
        <span key={m} className="inline-flex items-center gap-1 rounded-full bg-soft px-2 py-1 font-mono text-[11px] text-ink-2">
          <span className="text-ink-3">secours {i + 1}</span> {m}
          <button type="button" disabled={disabled} aria-label={`Retirer le modèle de secours ${m}`} onClick={() => onChange({ model, fallbacks: fallbacks.filter((f) => f !== m) })} className="text-ink-3 hover:text-ko">
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {fallbacks.length < MAX_FALLBACKS && (
        <span className="inline-flex items-center gap-1">
          <Input
            value={adding}
            disabled={disabled}
            placeholder="+ modèle de secours"
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFallback())}
            spellCheck={false}
            className="h-7 w-40 rounded-full font-mono text-[11px]"
          />
          {adding.trim() && (
            <button type="button" aria-label="Ajouter ce modèle de secours" onClick={addFallback} className="grid h-7 w-7 place-items-center rounded-full text-brand hover:bg-soft">
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      )}
    </div>
  );
}
