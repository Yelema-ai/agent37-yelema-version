import assert from "node:assert/strict";
import { test } from "node:test";
import type { OrgMember, OrgUnit } from "./memory.ts";
import { canDrop, canMoveUnit, childrenByParent, countsByUnit, initialCollapsed } from "./org-chart.ts";

const u = (id: string, parent: string | null, documents = 0): OrgUnit => ({ id, name: id, parent, documents });
const ids = (list?: OrgUnit[]) => (list ?? []).map((x) => x.id);

test("children by parent; an unknown parent or a loop goes to the top, no unit lost", () => {
  const map = childrenByParent([u("dg", null), u("fin", "dg"), u("orph", "x"), u("a", "b"), u("b", "a")]);
  assert.deepEqual(ids(map.get(null)), ["dg", "orph", "a"]);
  assert.deepEqual(ids(map.get("dg")), ["fin"]);
  assert.deepEqual(ids(map.get("a")), ["b"]);
  assert.deepEqual(ids(map.get("b")), []);
});

test("a unit never goes under itself or its own branch", () => {
  const units = [u("dg", null), u("fin", "dg"), u("compta", "fin")];
  assert.equal(canMoveUnit(units, "fin", "compta"), false);
  assert.equal(canMoveUnit(units, "fin", "fin"), false);
  assert.equal(canMoveUnit(units, "compta", "dg"), true);
  assert.equal(canMoveUnit(units, "fin", null), true);
});

test("drops: a unit anywhere but its branch, a member or an expert into a unit only", () => {
  const units = [u("dg", null), u("fin", "dg")];
  assert.equal(canDrop(units, { kind: "unit", id: "dg" }, "fin"), false);
  assert.equal(canDrop(units, { kind: "unit", id: "fin" }, null), true);
  assert.equal(canDrop(units, { kind: "member", member: "m" }, null), false);
  assert.equal(canDrop(units, { kind: "expert", member: "m", profile: "koffi" }, "fin"), true);
  assert.equal(canDrop(units, null, "fin"), false);
});

test("counts: members (whole instance), experts, documents; null is the whole company", () => {
  const m = {
    id: "m",
    units: [
      { id: "1", unit: "fin", role: "member", profile: null },
      { id: "2", unit: "fin", role: "member", profile: "koffi" },
    ],
  } as OrgMember;
  const c = countsByUnit({ units: [u("fin", null, 2)], members: [m], documents: 3 });
  assert.deepEqual(c.get("fin"), { members: 1, experts: 1, documents: 2 });
  assert.deepEqual(c.get(null), { members: 0, experts: 0, documents: 3 });
});

test("a large chart starts folded under the second level", () => {
  const units = [u("dg", null), u("fin", "dg"), u("compta", "fin"), ...Array.from({ length: 30 }, (_, i) => u(`x${i}`, "dg"))];
  const map = childrenByParent(units);
  assert.deepEqual([...initialCollapsed(map, units.length)], ["fin"]);
  assert.equal(initialCollapsed(map, 5).size, 0);
});
