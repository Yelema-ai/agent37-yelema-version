"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";
import { ChevronDown, ChevronRight, Minus, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import type { OrgUnit } from "@/lib/memory";
import { canDrop, childrenByParent, countsByUnit, initialCollapsed, type UnitCounts } from "@/lib/org-chart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Org } from "./context";
import { count } from "./styles";

const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25];
const TOOL = "inline-flex h-9 items-center gap-1 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink hover:bg-soft disabled:opacity-40";
const NONE: UnitCounts = { members: 0, experts: 0, documents: 0 };

export interface TreeActions {
  /** A new department, under `parent` (null: under the company). */
  onAdd: (parent: string | null) => void;
  onEdit: (unit: OrgUnit) => void;
  onDelete: (unit: OrgUnit) => void;
}

/**
 * The chart as a tree, from the company down: Sélim's board, kept to the boxes. A box says how
 * many people, experts and documents its department has; its actions sit in a « … » menu. A
 * department dragged onto another box moves under it; a person dragged from « Sans département »
 * joins the department dropped on.
 */
export function OrgTree({ org, company, ...act }: { org: Org; company: string } & TreeActions) {
  const { chart } = org;
  const children = useMemo(() => childrenByParent(chart.units), [chart.units]);
  const counts = useMemo(() => countsByUnit(chart), [chart]);
  const [collapsed, setCollapsed] = useState(() => initialCollapsed(children, chart.units.length));
  const [zoom, setZoom] = useState(3);
  // The department being moved, and the box it is over (`null`: the company's).
  const moving = useRef<string | null>(null);
  const [over, setOver] = useState<string | null | undefined>(undefined);

  const folders = chart.units.filter((u) => (children.get(u.id)?.length ?? 0) > 0).map((u) => u.id);
  const allOpen = collapsed.size === 0;

  const drag = {
    start: (e: DragEvent, id: string) => {
      e.stopPropagation();
      moving.current = id;
      e.dataTransfer.setData("text/plain", "unit");
      e.dataTransfer.effectAllowed = "move";
    },
    end: () => {
      moving.current = null;
      setOver(undefined);
    },
    over: (e: DragEvent, id: string | null) => {
      e.stopPropagation();
      if (moving.current) {
        if (!org.editable || !canDrop(chart.units, { kind: "unit", id: moving.current }, id)) return;
        e.preventDefault();
        if (over !== id) setOver(id);
      } else if (id) org.dragOver(e, id);
    },
    leave: (id: string | null) => {
      setOver((t) => (t === id ? undefined : t));
      if (id) org.dragLeave(id);
    },
    drop: (e: DragEvent, id: string | null) => {
      e.stopPropagation();
      const unit = moving.current;
      if (unit) {
        e.preventDefault();
        drag.end();
        if (canDrop(chart.units, { kind: "unit", id: unit }, id)) void org.change(`/api/org/units/${unit}`, "PATCH", { parent: id }, "Département déplacé.");
      } else if (id) org.drop(e, id);
    },
  };

  const t: Tree = {
    org,
    company,
    act,
    children,
    counts,
    collapsed,
    over,
    drag,
    toggle: (id) =>
      setCollapsed((s) => {
        const n = new Set(s);
        if (!n.delete(id)) n.add(id);
        return n;
      }),
  };

  return (
    <section aria-label="Organigramme en arborescence" className="mt-6 overflow-hidden rounded-[22px] border border-line bg-soft">
      <div className="flex flex-wrap items-center gap-2 border-b border-line bg-surface px-3 py-2">
        <button type="button" className={TOOL} aria-label="Dézoomer" disabled={zoom === 0} onClick={() => setZoom((z) => Math.max(0, z - 1))}>
          <Minus className="size-4" />
        </button>
        <span role="status" className="min-w-10 text-center text-xs tabular-nums text-ink-3">
          {Math.round((ZOOMS[zoom] ?? 1) * 100)} %
        </span>
        <button type="button" className={TOOL} aria-label="Zoomer" disabled={zoom === ZOOMS.length - 1} onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}>
          <Plus className="size-4" />
        </button>
        {folders.length > 0 && (
          <button type="button" className={TOOL} onClick={() => setCollapsed(allOpen ? new Set(folders) : new Set())}>
            {allOpen ? "Tout replier" : "Tout déplier"}
          </button>
        )}
      </div>
      <div className="max-h-[640px] overflow-auto p-6">
        <div style={{ zoom: ZOOMS[zoom] ?? 1 }} className="w-max min-w-full">
          <TreeNode unit={null} t={t} />
        </div>
      </div>
    </section>
  );
}

interface Tree {
  org: Org;
  company: string;
  act: TreeActions;
  children: Map<string | null, OrgUnit[]>;
  counts: Map<string | null, UnitCounts>;
  collapsed: Set<string>;
  over: string | null | undefined;
  drag: {
    start: (e: DragEvent, id: string) => void;
    end: () => void;
    over: (e: DragEvent, id: string | null) => void;
    leave: (id: string | null) => void;
    drop: (e: DragEvent, id: string | null) => void;
  };
  toggle: (id: string) => void;
}

function TreeNode({ unit, t }: { unit: OrgUnit | null; t: Tree }) {
  const { org, company, act, children, counts, collapsed, over, drag, toggle } = t;
  const { chart } = org;
  const id = unit?.id ?? null;
  const kids = children.get(id) ?? [];
  const folded = id != null && collapsed.has(id);
  const c = counts.get(id) ?? NONE;
  const lit = over === id || (id != null && org.target === id);
  return (
    <div className="flex flex-col items-center">
      <div
        draggable={org.editable && id != null}
        onDragStart={(e) => id && drag.start(e, id)}
        onDragEnd={drag.end}
        onDragOver={(e) => drag.over(e, id)}
        onDragLeave={() => drag.leave(id)}
        onDrop={(e) => drag.drop(e, id)}
        data-unit={id ?? "root"}
        className={cn(
          "rounded-2xl border px-3.5 py-2.5 text-left shadow-sm transition-shadow",
          unit ? "w-[220px] bg-surface" : "w-[244px] bg-tint",
          org.editable && id != null && "cursor-grab",
          lit ? "border-brand ring-2 ring-brand/30" : "border-line",
        )}
      >
        <div className="flex items-start gap-1">
          <div className="min-w-0 grow">
            <p className="text-[14px] font-bold leading-snug text-ink [overflow-wrap:anywhere]">{unit?.name ?? company}</p>
            <p className="mt-0.5 text-[12px] tabular-nums text-ink-3">
              {unit
                ? [count(c.members, "membre"), c.experts ? count(c.experts, "expert") : null, c.documents ? count(c.documents, "document") : null].filter(Boolean).join(", ")
                : `${count(chart.units.length, "département")}${c.documents ? `, ${count(c.documents, "document")} pour tous` : ""}`}
            </p>
          </div>
          {org.editable && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger
                aria-label={`Actions sur ${unit?.name ?? company}`}
                className="-mr-1.5 -mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink"
              >
                <MoreHorizontal className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onSelect={() => act.onAdd(id)}>
                  <Plus /> {unit ? "Ajouter un sous-département" : "Ajouter un département"}
                </DropdownMenuItem>
                {unit && (
                  <>
                    <DropdownMenuItem onSelect={() => act.onEdit(unit)}>
                      <Pencil /> Renommer ou déplacer
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => act.onDelete(unit)}>
                      <Trash2 /> Supprimer
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        {id != null && kids.length > 0 && (
          <button
            type="button"
            aria-expanded={!folded}
            onClick={() => toggle(id)}
            className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-brand-ink hover:underline"
          >
            {folded ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            {count(kids.length, "sous-département")}
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
                <TreeNode unit={k} t={t} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
