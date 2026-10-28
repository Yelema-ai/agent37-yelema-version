"use client";

import { useEffect, useState } from "react";
import { Check, CircleDashed, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { readiness, type JourZero } from "@/lib/jour-zero";
import { cn } from "@/lib/utils";
import { UpdateSpinner, useDeployPhase } from "@/components/app/DeployStatus";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cached, cachedFetch } from "@/lib/client-cache";

const TONE = {
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  absent: "bg-soft text-ink-3",
};
// Beside the expert's name (Leslie, 28/10): a dot and a word, lighter than a chip.
const DOT = {
  ready: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  partial: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300" },
  absent: { dot: "bg-ink-3", text: "text-ink-3" },
};

// Whether the expert has done its day-zero preparation: a chip, and its checks behind it.
export function ExpertReadiness({
  agentId,
  profileId,
  expertName,
  onOpenTools,
  className,
  variant = "chip",
}: {
  agentId: string;
  profileId: string;
  expertName: string;
  onOpenTools: () => void;
  className?: string;
  variant?: "chip" | "dot";
}) {
  const jzKey = `jour-zero:${agentId}:${profileId}`;
  const [jz, setJz] = useState<JourZero | null>(() => cached<JourZero>(jzKey) ?? null);
  const [open, setOpen] = useState(false);
  const updating = useDeployPhase() === "maintenance";

  // Changes as the expert prepares itself: kept a minute, so moving between experts asks nothing.
  useEffect(() => {
    let live = true;
    setJz(cached<JourZero>(jzKey) ?? null);
    cachedFetch(jzKey, () => apiFetch<JourZero>(`/api/agents/${agentId}/experts/${profileId}/jour-zero`), 60_000).then(
      (r) => live && setJz(r),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [agentId, profileId, jzKey]);

  // During an update the chip says so: the expert answers slower, and it is not a fault of its own.
  if (updating)
    return (
      <span role="status" className={cn("inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[12px] font-semibold text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", className)}>
        <UpdateSpinner className="size-3" /> Mise à jour
      </span>
    );
  if (!jz) return null;
  const r = readiness(jz);
  const Icon = r.state === "ready" ? Check : CircleDashed;
  return (
    <>
      {variant === "dot" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Voir sa préparation"
          className={cn("inline-flex items-center gap-1.5 text-[13px] font-semibold hover:underline", DOT[r.state].text, className)}
        >
          <span className={cn("size-2 rounded-full", DOT[r.state].dot)} /> {r.label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Voir sa préparation"
          className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold", TONE[r.state], className)}
        >
          <Icon className="size-3.5" /> {r.label}
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Préparation de {expertName}</DialogTitle>
            <DialogDescription>
              {r.state === "absent"
                ? `${expertName} n’a pas encore fait sa préparation du premier jour.`
                : `Ce que ${expertName} a vérifié avant de se mettre au travail${jz.date ? `, le ${new Date(jz.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}.`}
            </DialogDescription>
          </DialogHeader>
          {jz.checks.length > 0 && (
            <ul className="flex flex-col gap-3">
              {jz.checks.map((c) => (
                <li key={c.id} className="flex gap-2.5">
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", c.ok ? TONE.ready : TONE.partial)}>
                    {c.ok ? <Check className="size-3" /> : <X className="size-3" />}
                  </span>
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold text-ink">{c.label}</p>
                    {c.detail && <p className="text-ink-3">{c.detail}</p>}
                    {c.id === "outils" && (
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          onOpenTools();
                        }}
                        className="mt-0.5 text-xs font-semibold text-brand-ink hover:underline"
                      >
                        Ouvrir les connecteurs
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
