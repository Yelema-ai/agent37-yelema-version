"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import type { OrgChart, OrgUnit } from "@/lib/memory";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { Change } from "./org-chart/context";
import { OrgBoard } from "./org-chart/OrgBoard";
import { OrgGrants } from "./org-chart/OrgGrants";

// The company's org chart, drawn as boxes. It decides what each member's experts read in the
// company memory. The back office keeps it and applies it; every change here is one call, then
// the chart is read again. Only the workspace's admins change it.
export function OrgChartView() {
  const { current } = useWorkspace();
  const editable = current?.role === "admin";
  const [chart, setChart] = useState<OrgChart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<OrgUnit | null>(null);

  const load = useCallback(
    () =>
      apiFetch<OrgChart>("/api/org")
        .then(setChart)
        .catch((e: Error) => setError(e.message)),
    []
  );
  useEffect(() => void load(), [load]);

  // A refusal is shown as the back office says it (a loop, a unit still used, a place twice).
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

  return (
    <div>
      <h1 className="font-display text-[28px] font-bold tracking-tight text-ink">Organigramme</h1>
      <p className="mt-1 max-w-3xl text-sm text-ink-2">
        Chaque unité a son compartiment dans la mémoire de l’entreprise. Un membre lit celui de son unité ; un responsable lit aussi ceux des unités du dessous et dépose dans le sien. Un expert rattaché seul ne lit que ses propres unités. Ce qui est déposé pour toute l’entreprise est lu par tous.
      </p>

      {error && <p className="mt-4 max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p>}
      {!chart && !error && <Loader2 className="mt-6 h-5 w-5 animate-spin text-ink-3" aria-label="Chargement" />}

      {chart && (
        <>
          <OrgBoard chart={chart} company={current?.name ?? "L’entreprise"} editable={editable} change={change} askDelete={setRemoving} />
          {(chart.units.length > 0 || chart.grants.length > 0) && <OrgGrants chart={chart} editable={editable} change={change} />}
        </>
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Supprimer l’unité « ${removing?.name ?? ""} » ?`}
        description="Les unités du dessous remontent d’un cran. Une unité qui a encore des membres, des experts ou des documents réservés ne peut pas être supprimée."
        confirmText="Supprimer"
        destructive
        onConfirm={async () => {
          if (removing) await change(`/api/org/units/${removing.id}`, "DELETE", undefined, "Unité supprimée.");
        }}
      />
    </div>
  );
}
