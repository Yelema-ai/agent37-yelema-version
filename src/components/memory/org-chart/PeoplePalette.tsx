"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { memberName, type Org } from "./context";
import { CARD, count, FIELD } from "./styles";

const CHIP = "flex items-center justify-between gap-2 rounded-[10px] border border-line bg-surface px-2 py-1.5 text-[13px]";

/** The members and their experts, to drag onto a department of the tree: each drop adds a place. */
export function PeoplePalette({ org }: { org: Org }) {
  const { chart, editable } = org;
  const [filter, setFilter] = useState("");
  const q = filter.trim().toLowerCase();
  const people = chart.members.filter((m) => !q || memberName(m).toLowerCase().includes(q) || m.experts.some((e) => e.label.toLowerCase().includes(q)));
  const unitsOf = (m: (typeof people)[number], profile: string | null) => m.units.filter((p) => p.profile === profile).length;

  return (
    <aside aria-label="Membres et experts" className={cn(CARD, "max-h-[640px] w-full overflow-y-auto p-3 lg:w-[240px] lg:shrink-0")}>
      <h2 className="text-[13px] font-bold text-ink">Membres et experts</h2>
      <p className="mb-2 mt-0.5 text-xs text-ink-3">{editable ? "Glissez une personne, ou l’un de ses experts, sur un département." : "Lecture seule."}</p>
      {chart.members.length > 8 && (
        <input aria-label="Filtrer les membres" placeholder="Filtrer…" value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(FIELD, "mb-2 w-full")} />
      )}
      {people.length === 0 && <p className="text-xs text-ink-3">Aucun membre.</p>}
      <ul className="grid gap-1.5">
        {people.map((m) => {
          const n = unitsOf(m, null);
          return (
            <li key={m.id}>
              <div
                draggable={editable}
                onDragStart={(e) => org.dragStart(e, { kind: "member", member: m.id })}
                title="Toute son instance"
                className={cn(CHIP, editable && "cursor-grab", n === 0 ? "text-ink-3" : "text-ink")}
              >
                <span className="min-w-0 truncate font-semibold">{memberName(m)}</span>
                <span className="shrink-0 text-[11.5px] text-ink-3">{n ? count(n, "département") : "Sans département"}</span>
              </div>
              {m.experts.map((x) => {
                const own = unitsOf(m, x.profile);
                return (
                  <div
                    key={x.profile}
                    draggable={editable}
                    onDragStart={(e) => org.dragStart(e, { kind: "expert", member: m.id, profile: x.profile })}
                    title="Cet expert seulement"
                    className={cn(CHIP, "ml-4 mt-1", editable && "cursor-grab", own === 0 ? "text-ink-3" : "text-ink")}
                  >
                    <span className="min-w-0 truncate">{x.label}</span>
                    <span className="shrink-0 text-[11.5px] text-ink-3">{own ? count(own, "département") : "comme son membre"}</span>
                  </div>
                );
              })}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
