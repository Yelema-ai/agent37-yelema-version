"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { apiFetch } from "@/lib/api";
import type { LlmModelChoice, LlmWritten, LlmYelema } from "@/lib/llm";

const SELECT = "h-9 w-full rounded-full border border-line bg-surface px-3 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60 sm:w-64";

// Les modèles de Yelema, offerts à tous sans clé : le membre choisit celui de son instance, et au
// besoin un autre pour un expert. Le back-office tient la liste et pose le choix.
export function YelemaModels({ yelema, overridden, onChanged }: { yelema: LlmYelema; /** Une clé (la sienne ou celle de l’entreprise) prime aujourd’hui. */ overridden: boolean; onChanged: (out: LlmWritten) => Promise<void> }) {
  const { experts } = useExpertsContext();
  const [busy, setBusy] = useState<string | null>(null);
  const label = (id: string) => yelema.models.find((m) => m.id === id)?.label ?? id;
  const instanceModel = yelema.own.model ?? yelema.default;
  // Un seul modèle offert : il n’y a rien à choisir.
  if (yelema.models.length < 2) return null;

  async function pick(choice: LlmModelChoice, key: string) {
    setBusy(key);
    try {
      await onChanged(await apiFetch<LlmWritten>("/api/llm/own/model", { method: "PUT", body: JSON.stringify(choice) }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-[22px] border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3.5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint text-brand-ink">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">Modèles Yelema</h2>
          <p className="text-xs text-ink-3">Inclus, sans clé à fournir. Choisissez le modèle de vos experts ; vous pouvez aussi en changer dans une discussion, le temps de cette discussion.</p>
        </div>
      </div>

      {overridden && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">Une clé de modèle est en place : c’est elle qui sert aujourd’hui. Ce choix s’appliquera dès qu’elle sera retirée.</p>}

      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <label htmlFor="yelema-model-instance" className="text-sm font-medium text-ink">Tous mes experts</label>
        <select id="yelema-model-instance" className={SELECT} value={yelema.own.model ?? ""} disabled={busy !== null} onChange={(e) => void pick({ model: e.target.value || null }, "instance")}>
          <option value="">Par défaut ({label(yelema.default)})</option>
          {yelema.models.filter((m) => m.id !== yelema.default).map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {experts.length > 0 && (
        <div className="space-y-2 border-t border-line pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Un modèle différent pour un expert</p>
          {experts.map((x) => (
            <div key={x.profileId} className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <label htmlFor={`yelema-model-${x.profileId}`} className="truncate text-sm text-ink-2">{x.displayName}</label>
              <select id={`yelema-model-${x.profileId}`} className={SELECT} value={yelema.own.profiles[x.profileId] ?? ""} disabled={busy !== null} onChange={(e) => void pick({ model: e.target.value || null, profile: x.profileId }, x.profileId)}>
                <option value="">Comme mes autres experts ({label(instanceModel)})</option>
                {yelema.models.filter((m) => m.id !== instanceModel).map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
