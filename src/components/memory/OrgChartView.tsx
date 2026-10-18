"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGrid, Loader2, Network, Plus } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { orderUnits, type OrgChart, type OrgUnit } from "@/lib/memory";
import { canDrop, countsByUnit, type DragItem } from "@/lib/org-chart";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { cn } from "@/lib/utils";
import { DepartmentCard, UnplacedCard } from "./org-chart/DepartmentCard";
import { DepartmentDialog, type DepartmentDraft } from "./org-chart/DepartmentDialog";
import { OrgGrants } from "./org-chart/OrgGrants";
import { OrgTree } from "./org-chart/OrgTree";
import type { Change, Org } from "./org-chart/context";

/**
 * The company's org chart, as departments, in two views the admin switches between (remembered on
 * this browser): one card per department with its people in it, or the tree from the company
 * down. Below either, the people without one apart and the access exceptions folded. It decides what each
 * member's experts read in the company memory. The back office keeps it (its API still says
 * « unit ») and applies it; every change here is one call, then the chart is read again. Only the
 * workspace's admins change it.
 */
export function OrgChartView() {
  const { current } = useWorkspace();
  const company = current?.name ?? "Votre entreprise";
  const editable = current?.role === "admin";
  const [chart, setChart] = useState<OrgChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OrgUnit | null>(null);
  // `null` unit: a new department (under `parent`); otherwise the one being renamed or moved.
  const [editing, setEditing] = useState<{ unit: OrgUnit | null; parent?: string | null } | null>(null);
  const [view, setView] = useView();
  const [target, setTarget] = useState<string | null>(null);
  const dragged = useRef<DragItem | null>(null);

  const load = useCallback(
    () =>
      apiFetch<OrgChart>("/api/org")
        .then(setChart)
        .catch((e: Error) => setError(e.message)),
    []
  );
  useEffect(() => void load(), [load]);

  // A refusal is shown as the back office says it (a loop, a department still used, a place twice).
  const change: Change = async (url, method, body, done) => {
    try {
      await apiFetch(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      if (done) toast.success(done);
      await load();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };

  const ordered = useMemo(() => (chart ? orderUnits(chart.units) : []), [chart]);
  const counts = useMemo(() => (chart ? countsByUnit(chart) : new Map()), [chart]);

  if (!chart) {
    return (
      <div>
        <Header editable={false} onAdd={() => undefined} view={view} onView={setView} />
        {error ? <p className="mt-4 max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p> : <Loader2 className="mt-6 h-5 w-5 animate-spin text-ink-3" aria-label="Chargement" />}
      </div>
    );
  }

  const org: Org = {
    chart,
    editable,
    change,
    target,
    assign: (unit, member, profile) => change("/api/org/assignments", "POST", { unit, member, profile }, profile ? "Expert ajouté au département." : "Membre ajouté au département."),
    setRole: (id, role) => change(`/api/org/assignments/${id}`, "PATCH", { role }, "Rôle mis à jour."),
    dragStart: (e, item) => {
      dragged.current = item;
      e.dataTransfer.setData("text/plain", item.kind);
      e.dataTransfer.effectAllowed = "move";
    },
    dragOver: (e, unit) => {
      if (!editable || !canDrop(chart.units, dragged.current, unit)) return;
      e.preventDefault();
      if (target !== unit) setTarget(unit);
    },
    dragLeave: (unit) => setTarget((t) => (t === unit ? null : t)),
    drop: (e, unit) => {
      e.preventDefault();
      const item = dragged.current;
      dragged.current = null;
      setTarget(null);
      if (!item || item.kind === "unit" || !canDrop(chart.units, item, unit)) return;
      // Taken from a department: the same place moves. From the palette or « Sans département »: a new one.
      if (item.from) void change(`/api/org/assignments/${item.from.id}`, "PATCH", { unit }, item.kind === "expert" ? "Expert déplacé." : "Membre déplacé.");
      else void org.assign(unit, item.member, item.kind === "expert" ? item.profile : null);
    },
  };

  const parentName = (u: OrgUnit) => (u.parent ? chart.units.find((p) => p.id === u.parent)?.name ?? null : null);

  async function saveDepartment(draft: DepartmentDraft): Promise<boolean> {
    const unit = editing?.unit;
    if (!unit) return change("/api/org/units", "POST", { name: draft.name, parent: draft.parent }, `Département « ${draft.name} » créé.`);
    const patch: { name?: string; parent?: string | null } = {};
    if (draft.name !== unit.name) patch.name = draft.name;
    if (draft.parent !== unit.parent) patch.parent = draft.parent;
    if (!Object.keys(patch).length) return true;
    return change(`/api/org/units/${unit.id}`, "PATCH", patch, "Département mis à jour.");
  }

  return (
    <div>
      <Header editable={editable} onAdd={() => setEditing({ unit: null })} view={view} onView={setView} />

      {chart.units.length === 0 ? (
        <div className="mt-6 rounded-[22px] border border-dashed border-line bg-surface px-6 py-10 text-center">
          <p className="font-semibold text-ink">Aucun département pour l’instant.</p>
          {editable && (
            <Button className="mt-4" onClick={() => setEditing({ unit: null })}>
              <Plus /> Créer le premier département
            </Button>
          )}
        </div>
      ) : view === "arbre" ? (
        <OrgTree
          org={org}
          company={company}
          onAdd={(parent) => setEditing({ unit: null, parent })}
          onEdit={(unit) => setEditing({ unit })}
          onDelete={setRemoving}
        />
      ) : (
        <div className="mt-6 grid items-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {ordered.map(({ unit }) => (
            <DepartmentCard
              key={unit.id}
              org={org}
              unit={unit}
              parent={parentName(unit)}
              documents={counts.get(unit.id)?.documents ?? 0}
              onEdit={() => setEditing({ unit })}
              onDelete={() => setRemoving(unit)}
            />
          ))}
        </div>
      )}

      <UnplacedCard org={org} documents={chart.documents} />

      {(chart.units.length > 0 || chart.grants.length > 0) && <OrgGrants chart={chart} editable={editable} change={change} />}

      {editing && (
        <DepartmentDialog
          open
          onOpenChange={(open) => !open && setEditing(null)}
          units={chart.units}
          unit={editing.unit}
          parent={editing.parent}
          onSave={saveDepartment}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Supprimer le département « ${removing?.name ?? ""} » ?`}
        description="Ses sous-départements remontent d’un cran. Un département qui a encore des membres, des experts ou des documents ne peut pas être supprimé."
        confirmText="Supprimer"
        destructive
        onConfirm={async () => {
          if (removing) await change(`/api/org/units/${removing.id}`, "DELETE", undefined, "Département supprimé.");
        }}
      />
    </div>
  );
}

type View = "cartes" | "arbre";
const VIEW_KEY = "yelema.organigramme.vue";

// The view last chosen on this browser, read after the first render (the server has no storage).
function useView(): [View, (v: View) => void] {
  const [view, setView] = useState<View>("cartes");
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "arbre") setView("arbre");
    } catch {
      // No storage: the cards.
    }
  }, []);
  const choose = (v: View) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      // Remembered for this visit only.
    }
  };
  return [view, choose];
}

const VIEWS: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: "cartes", label: "Cartes", icon: LayoutGrid },
  { id: "arbre", label: "Arborescence", icon: Network },
];

function Header({ editable, onAdd, view, onView }: { editable: boolean; onAdd: () => void; view: View; onView: (v: View) => void }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Organigramme</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Chaque département a sa mémoire. Ses membres et leurs experts la lisent ; un responsable lit aussi celle des départements qui dépendent du sien.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
        <div role="group" aria-label="Vue" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => onView(id)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition-colors",
                view === id ? "bg-tint text-brand-ink" : "text-ink-2 hover:bg-soft hover:text-ink"
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
        {editable && (
          <Button onClick={onAdd}>
            <Plus /> Nouveau département
          </Button>
        )}
      </div>
    </div>
  );
}
