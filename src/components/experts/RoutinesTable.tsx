"use client";

import { useState } from "react";
import { History, Loader2, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react";
import { absoluteFr, relativeFr } from "@/lib/fr-dates";
import { paginate } from "@/lib/paginate";
import { ROUTINE_TIMEZONE, isOneOff, scheduleLabel, type Routine } from "@/lib/routines";
import { cn } from "@/lib/utils";
import { Pager } from "@/components/Pager";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const SIZES = [5, 10, 20];

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors disabled:opacity-50", on ? "bg-primary" : "bg-soft-2")}
    >
      <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-[left]", on ? "left-5" : "left-1")} />
    </button>
  );
}

function When({ iso, empty }: { iso: string | null; empty: string }) {
  const at = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(at)) return <span className="text-ink-3">{empty}</span>;
  return (
    <span className="flex flex-col">
      <span className="text-ink">{relativeFr(at)}</span>
      <span className="text-xs text-ink-3">{absoluteFr(at)}</span>
    </span>
  );
}

export interface RoutineActions {
  busyId: string | null;
  onToggle: (r: Routine, enabled: boolean) => void;
  onRunNow: (r: Routine) => void;
  onHistory: (r: Routine) => void;
  onEdit: (r: Routine) => void;
  onRemove: (r: Routine) => void;
}

// One section's routines as a table, 5 rows a page by default. `suggested`: shipped with the expert
// and never turned on, so a single "Activer" instead of the switch and the menu.
export function RoutinesTable({ routines, suggested = false, ...act }: { routines: Routine[]; suggested?: boolean } & RoutineActions) {
  const [size, setSize] = useState(SIZES[0]);
  const [page, setPage] = useState(1);
  const shown = paginate(routines, page, size);
  const th = "px-3 py-2 text-left text-xs font-semibold text-ink-3";

  return (
    <>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-line">
            <tr>
              <th className={th}>Nom</th>
              <th className={th}>Horaire</th>
              {!suggested && <th className={th}>État</th>}
              {!suggested && <th className={th}>Dernière exécution</th>}
              {!suggested && <th className={th}>Prochaine exécution</th>}
              <th className={cn(th, "w-12")}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.items.map((r) => {
              const busy = act.busyId === r.id;
              return (
                <tr key={r.id} className="align-top">
                  <td className="max-w-[18rem] px-3 py-3">
                    <p className="font-semibold text-ink">{r.name}</p>
                    <p className="line-clamp-2 text-[13px] text-ink-3">{r.summary}</p>
                  </td>
                  <td className="px-3 py-3 text-ink-2">
                    {scheduleLabel(r.schedule)}
                    <span className="block text-xs text-ink-3">{ROUTINE_TIMEZONE}</span>
                  </td>
                  {!suggested && (
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Switch on={r.enabled} label={`${r.enabled ? "Mettre en pause" : "Activer"} ${r.name}`} disabled={busy} onChange={() => act.onToggle(r, !r.enabled)} />
                        <span className={r.enabled ? "text-ink" : "text-ink-3"}>{r.enabled ? "Active" : "En pause"}</span>
                      </span>
                    </td>
                  )}
                  {!suggested && (
                    <td className="px-3 py-3">
                      <When iso={r.lastRunAt} empty="Jamais" />
                    </td>
                  )}
                  {!suggested && (
                    <td className="px-3 py-3">
                      <When iso={r.nextRunAt} empty="—" />
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right">
                    {suggested ? (
                      <Button size="sm" disabled={busy} onClick={() => act.onToggle(r, true)}>
                        {busy && <Loader2 className="animate-spin" />} Activer
                      </Button>
                    ) : (
                      <RowMenu routine={r} busy={busy} {...act} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Pager page={shown} total={routines.length} onPage={setPage} size={size} sizes={SIZES} onSize={(n) => (setSize(n), setPage(1))} />
    </>
  );
}

function RowMenu({ routine: r, busy, onRunNow, onHistory, onEdit, onRemove }: { routine: Routine; busy: boolean } & RoutineActions) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Actions pour ${r.name}`} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <MoreHorizontal />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {r.enabled && !isOneOff(r.schedule) && (
          <DropdownMenuItem onSelect={() => onRunNow(r)}>
            <Play /> Lancer maintenant
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => onHistory(r)}>
          <History /> Historique
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(r)}>
          <Pencil /> Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => onRemove(r)}>
          <Trash2 /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
