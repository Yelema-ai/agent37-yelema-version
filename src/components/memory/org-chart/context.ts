"use client";

import { createContext, useContext, type DragEvent } from "react";
import type { OrgChart, OrgRole, OrgUnit } from "@/lib/memory";
import type { DragItem, UnitCounts } from "@/lib/org-chart";

/** One change sent to the back office, then the chart read again; false when refused (already said). */
export type Change = (url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, done?: string) => Promise<boolean>;

/** What the boxes, the palette and the panel share. `null` is the company (the top box). */
export interface Board {
  chart: OrgChart;
  company: string;
  editable: boolean;
  children: Map<string | null, OrgUnit[]>;
  counts: Map<string | null, UnitCounts>;
  collapsed: Set<string>;
  toggle: (id: string) => void;
  selected: string | null | undefined;
  select: (id: string | null) => void;
  target: string | null | undefined;
  dragStart: (e: DragEvent, item: DragItem) => void;
  dragOver: (e: DragEvent, id: string | null) => void;
  dragLeave: (id: string | null) => void;
  drop: (e: DragEvent, id: string | null) => void;
  change: Change;
  assign: (unit: string, member: string, profile: string | null) => Promise<boolean>;
  setRole: (assignment: string, role: OrgRole) => Promise<boolean>;
  askDelete: (unit: OrgUnit) => void;
}

export const BoardContext = createContext<Board | null>(null);

export function useBoard(): Board {
  const b = useContext(BoardContext);
  if (!b) throw new Error("useBoard outside OrgBoard");
  return b;
}

export const memberName = (m: { name: string | null; email: string | null }): string => m.name?.trim() || m.email || "—";
