// The org chart drawn as a tree: children by parent, moves that would loop, counts per box, what
// starts folded. Pure, and the same behaviour as the back office's board
// (apps/control-plane/src/components/admin/tenant-workspace/org-chart/model.ts); `null` is the company.
import type { OrgChart, OrgUnit } from "./memory.ts";

/** What is dragged: a unit, a member (their whole instance) or one of their experts. */
export type DragItem = { kind: "unit"; id: string } | { kind: "member"; member: string } | { kind: "expert"; member: string; profile: string };

export type UnitCounts = { members: number; experts: number; documents: number };

/** A unit and every unit under it. */
export function subtree(units: readonly OrgUnit[], rootId: string): Set<string> {
  const children = new Map<string, string[]>();
  for (const u of units) if (u.parent != null) children.set(u.parent, [...(children.get(u.parent) ?? []), u.id]);
  const seen = new Set<string>();
  const queue = [rootId];
  for (let id = queue.pop(); id != null; id = queue.pop()) {
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...(children.get(id) ?? []));
  }
  return seen;
}

/** Children by parent. A unit whose parent is unknown, or caught in a loop, goes to the top: none is lost. */
export function childrenByParent(units: readonly OrgUnit[]): Map<string | null, OrgUnit[]> {
  const ids = new Set(units.map((u) => u.id));
  const map = new Map<string | null, OrgUnit[]>();
  const add = (key: string | null, u: OrgUnit) => map.set(key, [...(map.get(key) ?? []), u]);
  for (const u of units) add(u.parent != null && ids.has(u.parent) ? u.parent : null, u);
  const reached = new Set<string>();
  const walk = (key: string | null): void => {
    for (const c of map.get(key) ?? []) {
      if (reached.has(c.id)) continue;
      reached.add(c.id);
      walk(c.id);
    }
  };
  walk(null);
  for (const u of units) {
    if (reached.has(u.id)) continue;
    for (const [k, list] of map) map.set(k, list.filter((c) => c.id !== u.id));
    add(null, u);
    reached.add(u.id);
    walk(u.id);
  }
  return map;
}

/** May a unit go under `target` (`null`: the top) without ending up under itself? */
export const canMoveUnit = (units: readonly OrgUnit[], id: string, target: string | null): boolean => target == null || !subtree(units, id).has(target);

/** May this item be dropped on this box? A member or an expert goes into a unit, never onto the company. */
export const canDrop = (units: readonly OrgUnit[], item: DragItem | null, target: string | null): boolean =>
  item != null && (item.kind === "unit" ? item.id !== target && canMoveUnit(units, item.id, target) : target != null);

export function countsByUnit(chart: Pick<OrgChart, "units" | "members" | "documents">): Map<string | null, UnitCounts> {
  const out = new Map<string | null, UnitCounts>();
  const at = (k: string | null) => out.get(k) ?? (out.set(k, { members: 0, experts: 0, documents: 0 }).get(k) as UnitCounts);
  for (const m of chart.members) for (const p of m.units) at(p.unit)[p.profile == null ? "members" : "experts"] += 1;
  for (const u of chart.units) at(u.id).documents = u.documents;
  at(null).documents = chart.documents;
  return out;
}

/** Folded at first sight: past 30 units, only the first two levels stay open. */
export function initialCollapsed(children: Map<string | null, OrgUnit[]>, total: number): Set<string> {
  const out = new Set<string>();
  if (total <= 30) return out;
  const walk = (key: string | null, depth: number): void => {
    for (const c of children.get(key) ?? []) {
      if (depth >= 1 && (children.get(c.id)?.length ?? 0) > 0) out.add(c.id);
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}
