"use client";

import { MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import type { OrgMember, OrgPlacement, OrgRole, OrgUnit } from "@/lib/memory";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { initials, memberName, type Org } from "./context";
import { CARD, count, FIELD } from "./styles";

type Row = { member: OrgMember; place: OrgPlacement };

const ROLE_LABEL: Record<OrgRole, string> = { head: "Responsable", member: "Membre" };

/** One department: its people (heads first), the experts placed there on their own, and how to add someone. */
export function DepartmentCard({
  org,
  unit,
  parent,
  documents,
  onEdit,
  onDelete,
}: {
  org: Org;
  unit: OrgUnit;
  parent: string | null;
  documents: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { chart, editable } = org;
  const here: Row[] = chart.members.flatMap((member) => member.units.filter((p) => p.unit === unit.id).map((place) => ({ member, place })));
  const people = here.filter((r) => r.place.profile == null).sort((a, b) => (a.place.role === b.place.role ? 0 : a.place.role === "head" ? -1 : 1));
  const experts = here.filter((r) => r.place.profile != null);
  const expertLabel = (r: Row) => r.member.experts.find((x) => x.profile === r.place.profile)?.label ?? r.place.profile ?? "";
  const remove = (r: Row) => void org.change(`/api/org/assignments/${r.place.id}`, "DELETE", undefined, "Retiré du département.");

  const summary = [count(people.length, "membre"), experts.length ? count(experts.length, "expert") : null, documents ? count(documents, "document") : null].filter(Boolean).join(", ");

  return (
    <section
      aria-label={`Département ${unit.name}`}
      onDragOver={(e) => org.dragOver(e, unit.id)}
      onDragLeave={() => org.dragLeave(unit.id)}
      onDrop={(e) => org.drop(e, unit.id)}
      className={cn(CARD, "flex min-w-0 flex-col p-4 transition-shadow sm:p-5", org.target === unit.id && "border-brand ring-2 ring-brand/25")}
    >
      <header className="flex items-start gap-2">
        <div className="min-w-0 grow">
          {parent && <p className="truncate text-xs font-semibold text-ink-3">Dans {parent}</p>}
          <h2 className="font-display text-lg font-bold leading-snug text-ink [overflow-wrap:anywhere]">{unit.name}</h2>
          <p className="text-[13px] text-ink-3">{summary}</p>
        </div>
        {editable && (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Actions pour ${unit.name}`} className="grid size-9 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-soft hover:text-ink">
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Renommer ou déplacer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </header>

      {people.length === 0 ? (
        <p className="mt-3 rounded-xl bg-soft px-3 py-2.5 text-[13px] text-ink-3">Personne pour l’instant.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-1">
          {people.map((r) => {
            const name = memberName(r.member);
            return (
              <li
                key={r.place.id}
                draggable={editable}
                onDragStart={(e) => org.dragStart(e, { kind: "member", member: r.member.id, from: { id: r.place.id, unit: unit.id } })}
                className={cn("flex items-center gap-2.5 rounded-xl px-1.5 py-1.5", editable && "cursor-grab hover:bg-soft")}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tint text-[11px] font-bold text-brand-ink">{initials(name)}</span>
                <span className="min-w-0 grow truncate text-sm font-semibold text-ink">{name}</span>
                {editable ? (
                  <select
                    aria-label={`Rôle de ${name}`}
                    className={cn(FIELD, "h-8 shrink-0", r.place.role === "head" && "font-semibold text-brand-ink")}
                    value={r.place.role}
                    onChange={(e) => void org.setRole(r.place.id, e.target.value as OrgRole)}
                  >
                    <option value="member">{ROLE_LABEL.member}</option>
                    <option value="head">{ROLE_LABEL.head}</option>
                  </select>
                ) : (
                  r.place.role === "head" && <span className="shrink-0 rounded-full bg-tint px-2 py-0.5 text-xs font-semibold text-brand-ink">{ROLE_LABEL.head}</span>
                )}
                {editable && (
                  <button type="button" aria-label={`Retirer ${name}`} title="Retirer du département" onClick={() => remove(r)} className="grid size-8 shrink-0 place-items-center rounded-full text-ink-3 hover:bg-ko-pale hover:text-ko">
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {experts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold text-ink-3">Experts ajoutés seuls</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {experts.map((r) => (
              <li
                key={r.place.id}
                draggable={editable}
                onDragStart={(e) => org.dragStart(e, { kind: "expert", member: r.member.id, profile: r.place.profile ?? "", from: { id: r.place.id, unit: unit.id } })}
                className={cn("inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-2.5 pr-1 text-[13px] text-ink", editable && "cursor-grab")}
              >
                <span>
                  {expertLabel(r)} <span className="text-ink-3">de {memberName(r.member).split(" ")[0]}</span>
                </span>
                {editable ? (
                  <select
                    aria-label={`Rôle de ${expertLabel(r)}`}
                    className={cn(FIELD, "h-7 rounded-full px-1.5 text-xs", r.place.role === "head" && "font-semibold text-brand-ink")}
                    value={r.place.role}
                    onChange={(e) => void org.setRole(r.place.id, e.target.value as OrgRole)}
                  >
                    <option value="member">{ROLE_LABEL.member}</option>
                    <option value="head">{ROLE_LABEL.head}</option>
                  </select>
                ) : (
                  r.place.role === "head" && <span className="rounded-full bg-tint px-2 py-0.5 text-xs font-semibold text-brand-ink">{ROLE_LABEL.head}</span>
                )}
                {editable && (
                  <button type="button" aria-label={`Retirer ${expertLabel(r)}`} onClick={() => remove(r)} className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-ko-pale hover:text-ko">
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {editable && <AddSelect org={org} unit={unit} people={people} experts={experts} />}
    </section>
  );
}

function AddSelect({ org, unit, people, experts }: { org: Org; unit: OrgUnit; people: Row[]; experts: Row[] }) {
  const { chart } = org;
  const freeMembers = chart.members.filter((m) => !people.some((r) => r.member.id === m.id));
  const freeExperts = chart.members.flatMap((m) => m.experts.filter((x) => !experts.some((r) => r.member.id === m.id && r.place.profile === x.profile)).map((x) => ({ m, x })));
  if (!freeMembers.length && !freeExperts.length) return null;
  return (
    <select
      aria-label={`Ajouter à ${unit.name}`}
      className={cn(FIELD, "mt-3 w-full text-ink-2")}
      value=""
      onChange={(e) => {
        const [member, profile] = e.target.value.split("|");
        if (member) void org.assign(unit.id, member, profile || null);
      }}
    >
      <option value="">+ Ajouter une personne ou un expert</option>
      {freeMembers.length > 0 && (
        <optgroup label="Un membre et ses experts">
          {freeMembers.map((m) => (
            <option key={m.id} value={m.id}>
              {memberName(m)}
            </option>
          ))}
        </optgroup>
      )}
      {freeExperts.length > 0 && (
        <optgroup label="Un expert seul">
          {freeExperts.map(({ m, x }) => (
            <option key={`${m.id}|${x.profile}`} value={`${m.id}|${x.profile}`}>
              {`${x.label}, expert de ${memberName(m)}`}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

/** The members in no department: they read only what is left for the whole company. */
export function UnplacedCard({ org, documents }: { org: Org; documents: number }) {
  const { chart, editable } = org;
  const unplaced = chart.members.filter((m) => !m.units.some((p) => p.profile == null));
  return (
    <section aria-label="Sans département" className="mt-4 rounded-[22px] border border-dashed border-line bg-soft/60 p-4 sm:p-5">
      <h2 className="font-display text-lg font-bold text-ink">Sans département</h2>
      <p className="text-[13px] text-ink-3">
        {unplaced.length ? `${count(unplaced.length, "membre")}. Ils lisent seulement ce qui est pour toute l’entreprise` : "Tout le monde a un département"}
        {documents ? ` (${count(documents, "document")}).` : "."}
      </p>
      {unplaced.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {unplaced.map((m) => {
            const name = memberName(m);
            return (
              <li key={m.id} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-1.5">
                <span
                  draggable={editable}
                  onDragStart={(e) => org.dragStart(e, { kind: "member", member: m.id })}
                  className={cn("flex items-center gap-2", editable && "cursor-grab")}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-tint text-[11px] font-bold text-brand-ink">{initials(name)}</span>
                  <span className="text-sm font-semibold text-ink">{name}</span>
                </span>
                {editable && chart.units.length > 0 && (
                  <select
                    aria-label={`Département de ${name}`}
                    className={cn(FIELD, "h-7 rounded-full text-xs text-ink-2")}
                    value=""
                    onChange={(e) => e.target.value && void org.assign(e.target.value, m.id, null)}
                  >
                    <option value="">Placer dans…</option>
                    {chart.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
