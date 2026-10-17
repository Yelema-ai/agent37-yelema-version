"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { LLM_SOURCE_LABELS, LLM_STATE_LABELS, type LlmMember, type LlmState } from "@/lib/llm";
import { Badge } from "@/components/ui/badge";

const TONE: Record<LlmState, "success" | "warning" | "muted" | "destructive"> = { applied: "success", pending: "muted", failed: "warning", refused: "destructive" };

export function StateBadge({ state }: { state: LlmState }) {
  return <Badge variant={TONE[state]}>{LLM_STATE_LABELS[state]}</Badge>;
}

// Par membre, d'où vient le modèle de ses experts, replié. Une ligne mène à l'instance de ce membre.
export function MemberSources({ members, onPick }: { members: LlmMember[]; onPick: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (members.length === 0) return null;
  return (
    <section className="space-y-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-3 hover:text-ink">
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-90" : ""}`} /> Par membre ({members.length})
      </button>
      {open && (
        <ul className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
          {members.map((m) => (
            <li key={m.id}>
              <button type="button" onClick={() => onPick(m.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{m.name ?? m.email}</span>
                  {m.name && <span className="block truncate text-xs text-ink-3">{m.email}</span>}
                </span>
                <span className="shrink-0 text-xs text-ink-2">
                  {LLM_SOURCE_LABELS[m.source]}
                  {m.own ? ` · ${m.own.hint}` : ""}
                </span>
                <StateBadge state={m.state} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
