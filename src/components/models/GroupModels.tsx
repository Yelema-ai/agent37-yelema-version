"use client";

import { X } from "lucide-react";
import { MAX_FALLBACKS } from "@/lib/llm-accounts";
import type { ModelGroup } from "@/lib/model-options";
import { ModelPicker } from "./ModelPicker";

// Le modèle d'un fournisseur et ses modèles de secours, sur les mêmes comptes (Opus puis Sonnet).
export function GroupModels({ provider, options, model, fallbacks, onChange, disabled }: { provider: string; /** Les modèles de ce fournisseur. */ options: ModelGroup[]; model: string; fallbacks: string[]; onChange: (next: { model: string; fallbacks: string[] }) => void; disabled?: boolean }) {
  return (
    <div className="flex w-full flex-wrap items-center gap-1.5 text-xs sm:w-auto">
      <ModelPicker
        label="Modèle"
        groups={options}
        value={{ provider, model }}
        customProvider={provider}
        disabled={disabled}
        className="sm:w-56"
        onChange={(c) => c && c.model !== model && onChange({ model: c.model, fallbacks: fallbacks.filter((m) => m !== c.model) })}
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
        <ModelPicker
          label="Ajouter un modèle de secours"
          placeholder="+ modèle de secours"
          groups={options}
          value={null}
          customProvider={provider}
          disabled={disabled}
          className="sm:w-48"
          onChange={(c) => c && c.model !== model && !fallbacks.includes(c.model) && onChange({ model, fallbacks: [...fallbacks, c.model] })}
        />
      )}
    </div>
  );
}
