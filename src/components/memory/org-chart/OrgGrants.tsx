"use client";

import { useState } from "react";
import type { OrgChart, OrgGrant } from "@/lib/memory";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memberName, type Change } from "./context";
import { CARD, FIELD } from "./styles";

const NONE = "";

/** Access exceptions, folded: a department opened to one person or to another department, on top of the rule. */
export function OrgGrants({ chart, editable, change }: { chart: OrgChart; editable: boolean; change: Change }) {
  const [grantee, setGrantee] = useState(NONE);
  const [grantUnit, setGrantUnit] = useState(NONE);
  const [right, setRight] = useState<OrgGrant["right"]>("read");
  const unitName = (id: string | null) => chart.units.find((u) => u.id === id)?.name ?? "—";
  const personName = (id: string | null) => {
    const m = chart.members.find((x) => x.id === id);
    return m ? memberName(m) : "—";
  };

  return (
    <details className={cn(CARD, "mt-5 p-5 sm:p-6")}>
      <summary className="cursor-pointer select-none text-[15px] font-bold text-ink">
        Exceptions d’accès ({chart.grants.length})
        <span className="mt-0.5 block text-[13px] font-normal text-ink-3">Ouvrir la mémoire d’un département à une personne ou à un autre département.</span>
      </summary>
      {chart.grants.length === 0 && <p className="mt-3 text-sm text-ink-3">Aucune exception.</p>}
      <ul className="mt-3 divide-y divide-line">
        {chart.grants.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-ink">
            <span>
              <strong>{g.user ? personName(g.user) : `Département ${unitName(g.granteeUnit)}`}</strong> {g.right === "write" ? "lit et dépose dans" : "lit"} <strong>{unitName(g.unit)}</strong>
            </span>
            {editable && (
              <Button variant="ghost" size="sm" className="text-ko" onClick={() => void change(`/api/org/grants/${g.id}`, "DELETE")}>
                Retirer
              </Button>
            )}
          </li>
        ))}
      </ul>
      {editable && chart.units.length > 0 && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <select aria-label="Bénéficiaire" className={FIELD} value={grantee} onChange={(e) => setGrantee(e.target.value)}>
            <option value={NONE}>Qui…</option>
            {chart.members.map((m) => (
              <option key={m.id} value={`user:${m.id}`}>
                {memberName(m)}
              </option>
            ))}
            {chart.units.map((u) => (
              <option key={u.id} value={`unit:${u.id}`}>
                Département {u.name}
              </option>
            ))}
          </select>
          <select aria-label="Droit" className={FIELD} value={right} onChange={(e) => setRight(e.target.value as OrgGrant["right"])}>
            <option value="read">lit</option>
            <option value="write">lit et dépose dans</option>
          </select>
          <select aria-label="Département ouvert" className={FIELD} value={grantUnit} onChange={(e) => setGrantUnit(e.target.value)}>
            <option value={NONE}>Quel département…</option>
            {chart.units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            disabled={!grantee || !grantUnit}
            onClick={async () => {
              const [kind, id] = grantee.split(":");
              const who = kind === "user" ? { user: id } : { granteeUnit: id };
              if (await change("/api/org/grants", "POST", { ...who, unit: grantUnit, right })) setGrantee(NONE);
            }}
          >
            Ajouter l’exception
          </Button>
        </div>
      )}
    </details>
  );
}
