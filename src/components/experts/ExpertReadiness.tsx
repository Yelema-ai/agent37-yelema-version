"use client";

import { useEffect, useState } from "react";
import { Check, CircleDashed, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { readiness, type JourZero } from "@/lib/jour-zero";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TONE = {
  ready: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  absent: "bg-soft text-ink-3",
};

// Whether the expert is usable and has done its day-zero preparation: a chip that says it in words,
// a one-line hint on hover, and its checks behind it (what is left to do first).
export function ExpertReadiness({
  agentId,
  profileId,
  expertName,
  onOpenTools,
  compact = false,
  className,
}: {
  agentId: string;
  profileId: string;
  expertName: string;
  onOpenTools: () => void;
  /** In a narrow strip: « Prêt » or « Utilisable » alone, the rest on hover and behind it. */
  compact?: boolean;
  className?: string;
}) {
  const [jz, setJz] = useState<JourZero | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let live = true;
    apiFetch<JourZero>(`/api/agents/${agentId}/experts/${profileId}/jour-zero`).then(
      (r) => live && setJz(r),
      () => undefined
    );
    return () => {
      live = false;
    };
  }, [agentId, profileId]);

  if (!jz) return null;
  const r = readiness(jz);
  const Icon = r.state === "ready" ? Check : CircleDashed;
  return (
    <>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn("inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-left text-[12px] font-semibold", TONE[r.state], className)}
            >
              <Icon className="size-3.5 shrink-0" /> <span className="truncate">{compact ? (r.state === "ready" ? "Prêt" : "Utilisable") : r.label}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{r.hint}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Préparation de {expertName}</DialogTitle>
            <DialogDescription>
              {r.state === "ready" ? "" : `Vous pouvez déjà écrire à ${expertName}. `}
              {r.state === "absent"
                ? `${expertName} n’a pas encore fait sa préparation du premier jour.`
                : `Ce que ${expertName} a vérifié avant de se mettre au travail${jz.date ? `, le ${new Date(jz.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}` : ""}.`}
            </DialogDescription>
          </DialogHeader>
          {jz.checks.length > 0 && (
            <ul className="flex flex-col gap-3">
              {[...jz.checks].sort((a, b) => Number(a.ok) - Number(b.ok)).map((c) => (
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
                        Ouvrir l’onglet Outils
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
