"use client";

import { LLM_SOURCE_LABELS, LLM_STATE_LABELS, type LlmMember, type LlmState } from "@/lib/llm";
import { Badge } from "@/components/ui/badge";

const TONE: Record<LlmState, "success" | "warning" | "muted" | "destructive"> = { applied: "success", pending: "muted", failed: "warning", refused: "destructive" };

export function StateBadge({ state }: { state: LlmState }) {
  return <Badge variant={TONE[state]}>{LLM_STATE_LABELS[state]}</Badge>;
}

// Par membre, d'où vient le modèle de ses experts. Une ligne mène au réglage de ce membre.
export function MemberSources({ members, onPick }: { members: LlmMember[]; onPick: (id: string) => void }) {
  if (members.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-3">Par membre</h2>
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
    </section>
  );
}
