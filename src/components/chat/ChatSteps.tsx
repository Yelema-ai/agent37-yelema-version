"use client";

import { useState } from "react";
import { Check, ChevronDown, ListChecks, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { stepDone } from "@/lib/tool-steps";
import type { ToolEvent } from "./types";

// While the expert answers: its latest step, in one quiet line that stays until the reply comes.
export function LiveStep({ tools }: { tools: ToolEvent[] }) {
  const current = tools.findLast((t) => t.status === "running") ?? tools.at(-1);
  if (!current) return null;
  return (
    <p className="mb-2 flex items-center gap-2 text-[13px] text-ink-3" aria-live="polite">
      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      <span className="truncate">{current.phrase}</span>
    </p>
  );
}

// Once the answer is done: the steps it took, folded by default.
export function StepsList({ tools }: { tools: ToolEvent[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-xs text-ink-3 transition-colors hover:text-ink"
      >
        <ListChecks className="h-3.5 w-3.5" />
        Étapes ({tools.length})
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ol className="mt-1 space-y-1 border-l-2 border-line pl-3">
          {tools.map((t, k) => (
            <li key={`${t.tool}-${k}`} className="flex items-center gap-2 text-xs text-ink-2">
              {t.status === "error" ? <X className="h-3.5 w-3.5 shrink-0 text-ko" /> : <Check className="h-3.5 w-3.5 shrink-0 text-ok" />}
              <span className="truncate">{stepDone(t.phrase)}</span>
              {t.durationMs != null && <span className="ml-auto tabular-nums text-ink-3">{(t.durationMs / 1000).toFixed(1)} s</span>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
