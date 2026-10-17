"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { OrgChart, OrgUnit } from "@/lib/memory";
import { canDrop, childrenByParent, countsByUnit, initialCollapsed, type DragItem } from "@/lib/org-chart";
import { cn } from "@/lib/utils";
import { BoardContext, type Board, type Change } from "./context";
import { PeoplePalette } from "./PeoplePalette";
import { CARD } from "./styles";
import { UnitNode } from "./UnitNode";
import { UnitPanel } from "./UnitPanel";

const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25];
const TOOL = "h-8 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink hover:bg-soft disabled:opacity-40";

/** The chart as boxes: drag a unit to move it, a person or one of their experts to place them. */
export function OrgBoard({ chart, company, editable, change, askDelete }: { chart: OrgChart; company: string; editable: boolean; change: Change; askDelete: (u: OrgUnit) => void }) {
  const children = useMemo(() => childrenByParent(chart.units), [chart.units]);
  const counts = useMemo(() => countsByUnit(chart), [chart]);
  const [collapsed, setCollapsed] = useState(() => initialCollapsed(children, chart.units.length));
  const [zoom, setZoom] = useState(3);
  const [selected, setSelected] = useState<string | null | undefined>(undefined);
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const dragged = useRef<DragItem | null>(null);

  const assign: Board["assign"] = (unit, member, profile) => change("/api/org/assignments", "POST", { unit, member, profile }, profile ? "Expert rattaché." : "Membre rattaché.");
  const board: Board = {
    chart, company, editable, children, counts, collapsed, selected, target, change, assign, askDelete,
    setRole: (id, role) => change(`/api/org/assignments/${id}`, "PATCH", { role }, "Place mise à jour."),
    toggle: (id) => setCollapsed((s) => { const n = new Set(s); if (!n.delete(id)) n.add(id); return n; }),
    select: (id) => setSelected((s) => (s === id ? undefined : id)),
    dragStart: (e, item) => {
      e.stopPropagation();
      dragged.current = item;
      e.dataTransfer.setData("text/plain", item.kind);
      e.dataTransfer.effectAllowed = "move";
    },
    dragOver: (e, id) => {
      if (!editable || !canDrop(chart.units, dragged.current, id)) return;
      e.preventDefault();
      e.stopPropagation();
      if (target !== id) setTarget(id);
    },
    dragLeave: (id) => setTarget((t) => (t === id ? undefined : t)),
    drop: (e, id) => {
      e.preventDefault();
      e.stopPropagation();
      const item = dragged.current;
      dragged.current = null;
      setTarget(undefined);
      if (!item || !canDrop(chart.units, item, id)) return void toast.error("Impossible de déposer ici.");
      if (item.kind === "unit") void change(`/api/org/units/${item.id}`, "PATCH", { parent: id }, "Unité déplacée.");
      else void assign(id ?? "", item.member, item.kind === "expert" ? item.profile : null);
    },
  };

  const allOpen = collapsed.size === 0;
  return (
    <BoardContext.Provider value={board}>
      <div className="mt-5 flex flex-col items-start gap-4 lg:flex-row">
        <PeoplePalette />
        <section aria-label="Organigramme" className={cn(CARD, "w-full min-w-0 flex-1 overflow-hidden bg-soft")}>
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
            <button type="button" className={TOOL} aria-label="Dézoomer" disabled={zoom === 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}>
              −
            </button>
            <span role="status" className="min-w-10 text-center text-xs tabular-nums text-ink-3">
              {Math.round((ZOOMS[zoom] ?? 1) * 100)} %
            </span>
            <button type="button" className={TOOL} aria-label="Zoomer" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}>
              +
            </button>
            <button
              type="button"
              className={TOOL}
              onClick={() => setCollapsed(allOpen ? new Set(chart.units.filter((u) => (children.get(u.id)?.length ?? 0) > 0).map((u) => u.id)) : new Set())}
            >
              {allOpen ? "Tout replier" : "Tout déplier"}
            </button>
            {chart.units.length === 0 && editable && <span className="text-xs text-ink-3">Commencez par « + Unité » sur la boîte de l’entreprise.</span>}
          </div>
          <div className="max-h-[640px] overflow-auto p-6">
            <div style={{ zoom: ZOOMS[zoom] ?? 1 }} className="w-max min-w-full">
              <UnitNode unit={null} />
            </div>
          </div>
        </section>
        {selected !== undefined && <UnitPanel key={selected ?? "root"} unitId={selected} />}
      </div>
    </BoardContext.Provider>
  );
}
