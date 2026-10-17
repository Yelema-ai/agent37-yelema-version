"use client";

import { useState } from "react";
import type { OrgUnit } from "@/lib/memory";
import { cn } from "@/lib/utils";
import { useBoard } from "./context";
import { InlineName } from "./InlineName";
import { count, LINK, LINK_KO } from "./styles";

const NONE = { members: 0, experts: 0, documents: 0 };

/** One box of the chart and its branch. `unit` null: the company's box, at the top. */
export function UnitNode({ unit }: { unit: OrgUnit | null }) {
  const b = useBoard();
  const id = unit?.id ?? null;
  const kids = b.children.get(id) ?? [];
  const folded = id != null && b.collapsed.has(id);
  const [mode, setMode] = useState<"idle" | "add" | "rename">("idle");
  const c = b.counts.get(id) ?? NONE;
  const name = unit?.name ?? b.company;
  const counts = unit
    ? `${count(c.members, "membre")} · ${count(c.experts, "expert")} · ${count(c.documents, "document")}`
    : `${count(b.chart.units.length, "unité")} · ${count(c.documents, "document")} pour tous`;

  return (
    <div className="flex flex-col items-center">
      <div
        draggable={b.editable && id != null && mode === "idle"}
        onDragStart={(e) => id != null && b.dragStart(e, { kind: "unit", id })}
        onDragOver={(e) => b.dragOver(e, id)}
        onDragLeave={() => b.dragLeave(id)}
        onDrop={(e) => b.drop(e, id)}
        data-unit={id ?? "root"}
        className={cn(
          "rounded-[14px] border px-3 py-2 text-left shadow-sm transition-shadow",
          unit ? "w-[216px] bg-surface" : "w-[240px] bg-tint",
          b.editable && id != null && "cursor-grab",
          b.target === id ? "border-brand ring-2 ring-brand/30" : b.selected === id ? "border-brand shadow-md" : "border-line"
        )}
      >
        <button type="button" className="block w-full text-left text-[13px] font-bold text-ink [overflow-wrap:anywhere] hover:underline" aria-pressed={b.selected === id} onClick={() => b.select(id)}>
          {name}
        </button>
        <span className="mt-0.5 block text-[11.5px] tabular-nums text-ink-3">{counts}</span>
        {b.editable && mode === "idle" && (
          <span className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
            <button type="button" className={LINK} onClick={() => setMode("add")}>
              + Unité
            </button>
            {unit && (
              <>
                <button type="button" className={LINK} onClick={() => setMode("rename")}>
                  Renommer
                </button>
                <button type="button" className={LINK_KO} onClick={() => b.askDelete(unit)}>
                  Supprimer
                </button>
              </>
            )}
          </span>
        )}
        {mode !== "idle" && (
          <InlineName
            label={mode === "add" ? "Nom de la nouvelle unité" : "Nouveau nom"}
            initial={mode === "rename" ? name : ""}
            onCancel={() => setMode("idle")}
            onSubmit={(value) => {
              setMode("idle");
              void (mode === "add" ? b.change("/api/org/units", "POST", { name: value, parent: id }, "Unité créée.") : b.change(`/api/org/units/${id}`, "PATCH", { name: value }, "Unité renommée."));
            }}
          />
        )}
        {id != null && kids.length > 0 && (
          <button type="button" className={cn(LINK, "mt-1 block")} aria-expanded={!folded} onClick={() => b.toggle(id)}>
            {folded ? `▸ Déplier (${kids.length})` : "▾ Replier"}
          </button>
        )}
      </div>
      {kids.length > 0 && !folded && (
        <>
          <span className="h-4 w-px bg-ink-3/40" />
          <div className="flex items-start justify-center">
            {kids.map((k, i) => (
              <div key={k.id} className="relative flex flex-col items-center px-2">
                <span className={cn("absolute top-0 h-px bg-ink-3/40", i === 0 ? "left-1/2" : "left-0", i === kids.length - 1 ? "right-1/2" : "right-0")} />
                <span className="h-4 w-px bg-ink-3/40" />
                <UnitNode unit={k} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
