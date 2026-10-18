import type { DragEvent } from "react";
import type { OrgChart } from "@/lib/memory";
import type { DragItem } from "@/lib/org-chart";

/** One change sent to the back office, then the chart read again; false when refused (already said). */
export type Change = (url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, done?: string) => Promise<boolean>;

/** What the department cards share: the chart, the gestures, and the card a person is dragged over. */
export interface Org {
  chart: OrgChart;
  editable: boolean;
  change: Change;
  /** The department a person or an expert is being dragged over. */
  target: string | null;
  assign: (unit: string, member: string, profile: string | null) => Promise<boolean>;
  dragStart: (e: DragEvent, item: DragItem) => void;
  dragOver: (e: DragEvent, unit: string) => void;
  dragLeave: (unit: string) => void;
  drop: (e: DragEvent, unit: string) => void;
}

export const memberName = (m: { name: string | null; email: string | null }): string => m.name?.trim() || m.email || "—";

/** « AD » for Aïcha Diabaté. */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";
