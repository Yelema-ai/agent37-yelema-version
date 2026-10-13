"use client";

import { Building2, User } from "lucide-react";
import type { SettingScope } from "@/lib/llm";
import { cn } from "@/lib/utils";

export interface ScopeMember {
  id: string;
  name: string | null;
  email: string;
}

const memberLabel = (m: ScopeMember) => (m.name ? `${m.name} (${m.email})` : m.email);

// Pour qui l'administrateur règle : toute l'entreprise, ou un membre. Partagé par Modèles et MCP.
// Un réglage posé pour un membre passe avant celui de l'entreprise, sur son instance seulement.
export function ScopePicker({ members, value, onChange }: { members: ScopeMember[]; value: SettingScope; onChange: (scope: SettingScope) => void }) {
  const forMember = value.kind === "member";
  const first = members[0];
  const tab = "flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div role="tablist" aria-label="Portée du réglage" className="grid shrink-0 grid-cols-2 rounded-xl border border-line bg-soft p-1">
        <button type="button" role="tab" aria-selected={!forMember} onClick={() => onChange({ kind: "client" })} className={cn(tab, !forMember ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink")}>
          <Building2 className="h-3.5 w-3.5" />
          Toute l’entreprise
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={forMember}
          disabled={!first}
          onClick={() => first && !forMember && onChange({ kind: "member", id: first.id })}
          className={cn(tab, forMember ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink", !first && "cursor-not-allowed opacity-50")}
        >
          <User className="h-3.5 w-3.5" />
          Un membre
        </button>
      </div>
      {forMember && (
        <select
          aria-label="Membre"
          value={value.id}
          onChange={(e) => onChange({ kind: "member", id: e.target.value })}
          className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm text-ink focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15 sm:max-w-sm"
        >
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {memberLabel(m)}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
