"use client";

import { orderUnits, type OrgMember, type OrgPlacement, type OrgRole } from "@/lib/memory";
import { canMoveUnit } from "@/lib/org-chart";
import { cn } from "@/lib/utils";
import { memberName, useBoard } from "./context";
import { CARD, count, FIELD, HEADING, LINK, LINK_KO } from "./styles";

const TOP = "__top__";
const ROLES: { value: OrgRole; label: string }[] = [
  { value: "member", label: "Membre" },
  { value: "head", label: "Responsable" },
];

type Row = { member: OrgMember; place: OrgPlacement };

/** The detail of one box: its members, its experts, and every gesture without dragging. */
export function UnitPanel({ unitId }: { unitId: string | null }) {
  const b = useBoard();
  const { chart } = b;
  const unit = unitId == null ? null : chart.units.find((u) => u.id === unitId);
  if (unitId != null && !unit) return null;

  const here: Row[] = chart.members.flatMap((member) => member.units.filter((p) => p.unit === unitId).map((place) => ({ member, place })));
  const members = here.filter((r) => r.place.profile == null);
  const experts = here.filter((r) => r.place.profile != null);
  const unplaced = chart.members.filter((m) => !m.units.some((p) => p.profile == null));
  const docs = b.counts.get(unitId)?.documents ?? 0;
  const expertLabel =(r: Row) => r.member.experts.find((x) => x.profile === r.place.profile)?.label ?? r.place.profile ?? "";

  const row = (r: Row, label: string, sub: string) => (
    <li key={r.place.id} className="flex items-center justify-between gap-2 text-[13px]">
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{label}</span>
        <span className="block truncate text-xs text-ink-3">{sub}</span>
      </span>
      {b.editable ? (
        <span className="flex shrink-0 items-center gap-2">
          <select aria-label={`Place de ${label}`} className={FIELD} value={r.place.role} onChange={(e) => void b.setRole(r.place.id, e.target.value as OrgRole)}>
            {ROLES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
          <button type="button" className={LINK_KO} onClick={() => void b.change(`/api/org/assignments/${r.place.id}`, "DELETE", undefined, "Rattachement retiré.")}>
            Retirer
          </button>
        </span>
      ) : (
        <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-xs text-ink-2">{ROLES.find((x) => x.value === r.place.role)?.label}</span>
      )}
    </li>
  );

  return (
    <aside aria-label={unit ? `Unité ${unit.name}` : "Toute l’entreprise"} className={cn(CARD, "max-h-[640px] w-full overflow-y-auto p-4 lg:w-[320px] lg:shrink-0")}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-[16px] font-bold text-ink">{unit ? unit.name : "Toute l’entreprise"}</h2>
        <button type="button" className={LINK} onClick={() => b.select(unitId)}>
          Fermer
        </button>
      </div>

      {unit && b.editable && (
        <>
          <div className={HEADING}>Rattachée à</div>
          <select
            aria-label="Unité du dessus"
            className={cn(FIELD, "w-full")}
            value={unit.parent ?? TOP}
            onChange={(e) => void b.change(`/api/org/units/${unit.id}`, "PATCH", { parent: e.target.value === TOP ? null : e.target.value }, "Unité déplacée.")}
          >
            <option value={TOP}>{b.company} (sommet)</option>
            {orderUnits(chart.units)
              .filter(({ unit: u }) => canMoveUnit(chart.units, unit.id, u.id))
              .map(({ unit: u, depth }) => (
                <option key={u.id} value={u.id}>
                  {`${"  ".repeat(depth)}${u.name}`}
                </option>
              ))}
          </select>
        </>
      )}

      {unit ? (
        <>
          <div className={HEADING}>Membres ({members.length})</div>
          {members.length ? <ul className="grid gap-2">{members.map((r) => row(r, memberName(r.member), "Tous ses experts"))}</ul> : <p className="text-xs text-ink-3">Aucun membre.</p>}
          <div className={HEADING}>Experts ({experts.length})</div>
          {experts.length ? (
            <ul className="grid gap-2">{experts.map((r) => row(r, expertLabel(r), `Expert de ${memberName(r.member)}`))}</ul>
          ) : (
            <p className="text-xs text-ink-3">Aucun expert rattaché seul.</p>
          )}
          {b.editable && (
            <select
              aria-label="Rattacher un membre ou un expert"
              className={cn(FIELD, "mt-3 w-full")}
              value=""
              onChange={(e) => {
                const [member, profile] = e.target.value.split("|");
                if (member) void b.assign(unit.id, member, profile || null);
              }}
            >
              <option value="">Rattacher…</option>
              <optgroup label="Un membre et tous ses experts">
                {chart.members
                  .filter((m) => !members.some((r) => r.member.id === m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {memberName(m)}
                    </option>
                  ))}
              </optgroup>
              <optgroup label="Un expert seulement">
                {chart.members.flatMap((m) =>
                  m.experts
                    .filter((x) => !experts.some((r) => r.member.id === m.id && r.place.profile === x.profile))
                    .map((x) => (
                      <option key={`${m.id}|${x.profile}`} value={`${m.id}|${x.profile}`}>
                        {`${x.label} — ${memberName(m)}`}
                      </option>
                    ))
                )}
              </optgroup>
            </select>
          )}
        </>
      ) : (
        <>
          <div className={HEADING}>Sans unité ({unplaced.length})</div>
          <p className="text-xs text-ink-3">Ils ne lisent que ce qui est déposé pour toute l’entreprise.</p>
          <ul className="mt-2 grid gap-1 text-[13px] text-ink">
            {unplaced.map((m) => (
              <li key={m.id}>{memberName(m)}</li>
            ))}
          </ul>
        </>
      )}

      <div className={HEADING}>Documents</div>
      <p className="text-xs text-ink-3">
        {docs > 0
          ? `${count(docs, "document")} ${unit ? `réservé${docs > 1 ? "s" : ""} à cette unité` : "pour toute l’entreprise"}, à voir dans Entreprise.`
          : unit
            ? "Aucun document réservé à cette unité."
            : "Aucun document pour toute l’entreprise."}
      </p>
    </aside>
  );
}
