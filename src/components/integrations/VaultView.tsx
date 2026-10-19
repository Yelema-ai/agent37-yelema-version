"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, Lock, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import type { McpOverview } from "@/lib/mcp-servers";
import { IDENTIFIER_TYPES, profileLabel, type VaultDraft, type VaultItem, type VaultList, type VaultScope } from "@/lib/vault";
import { cn } from "@/lib/utils";
import { VaultItemDialog } from "./VaultItemDialog";

const url = (scope: VaultScope, profile: string, handle?: string) =>
  `/api/vault/${scope.kind === "own" ? "own" : `members/${encodeURIComponent(scope.id)}`}/${encodeURIComponent(profile)}${handle ? `/${encodeURIComponent(handle)}` : ""}`;

const typeLabel = (t: VaultItem["identifierType"]) => IDENTIFIER_TYPES.find((x) => x.value === t)?.label ?? t;

// Intégrations · Identifiants : d'abord l'expert, puis ses connexions. Un administrateur choisit aussi
// le membre dont il règle l'instance. Rien n'est gardé ici : chaque affichage relit le coffre.
export function VaultView() {
  const [members, setMembers] = useState<{ id: string; label: string }[] | null>(null);
  const [scope, setScope] = useState<VaultScope>({ kind: "own" });
  const [profile, setProfile] = useState("default");
  const [data, setData] = useState<VaultList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<VaultItem | null>(null);

  // Les membres de l'espace, pour un administrateur seulement (le même aperçu que l'écran MCP).
  useEffect(() => {
    apiFetch<McpOverview>("/api/mcp")
      .then((o) => setMembers(o.members ? o.members.map((m) => ({ id: m.id, label: m.name ?? m.email })) : []))
      .catch(() => setMembers([]));
  }, []);

  const load = useCallback(async () => {
    setData(null);
    try {
      const list = await apiFetch<VaultList>(url(scope, profile));
      setData(list);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [scope, profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const expertName = profileLabel(profile);

  async function add(draft: VaultDraft) {
    await apiFetch(url(scope, profile), { method: "POST", body: JSON.stringify(draft) });
    toast.success(`Connexion « ${draft.label} » confiée à ${expertName}`);
    setAdding(false);
    await load();
  }

  async function remove() {
    if (!removing) return;
    await apiFetch(url(scope, profile, removing.id), { method: "DELETE" });
    toast.success(`Connexion « ${removing.label} » retirée`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Identifiants des experts</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-3">Confiez à un expert l’accès à un site : il s’y connecte pour vous, sans jamais voir le mot de passe.</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={!data} className="self-start sm:self-auto">
          <Plus /> Ajouter une connexion
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {members && members.length > 0 && (
          <label className="space-y-1 text-xs font-semibold text-ink-3">
            <span>Instance de</span>
            <select
              value={scope.kind === "own" ? "" : scope.id}
              onChange={(e) => {
                setScope(e.target.value ? { kind: "member", id: e.target.value } : { kind: "own" });
                setProfile("default");
              }}
              className="block rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
            >
              <option value="">Moi</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="space-y-1">
          <p className="text-xs font-semibold text-ink-3">Expert</p>
          <div className="flex flex-wrap gap-1.5">
            {(data?.profiles ?? [profile]).map((p) => (
              <button key={p} type="button" aria-pressed={p === profile} onClick={() => setProfile(p)} className={cn("rounded-full border px-3 py-1.5 text-[13px] font-semibold", p === profile ? "border-brand bg-tint text-brand" : "border-line bg-surface text-ink-2")}>
                {profileLabel(p)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3.5 rounded-[22px] border border-line bg-surface p-4 text-sm text-ink-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-brand">
          <Lock className="h-5 w-5" />
        </div>
        <p className="text-xs leading-relaxed text-ink-3">
          Les mots de passe sont chiffrés dans le coffre de l’instance. Yelema ne les garde pas et ne les affiche jamais. Pas de double authentification : choisissez un compte qui n’en demande pas. L’expert ne remplit que les pages du site exact enregistré.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Connexions de {expertName} ({data ? data.items.length : "…"})</p>
        {error && !data ? (
          <p className="max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p>
        ) : !data ? (
          <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-[22px] border border-line bg-surface p-8 text-xs text-ink-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            Lecture du coffre de l’instance…
          </div>
        ) : data.items.length ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((it) => (
              <div key={it.id} className="flex items-start gap-3 rounded-[22px] border border-line bg-surface py-3 pl-4 pr-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-brand">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">{it.label}</p>
                  <p className="truncate font-mono text-[12px] text-ink-3" title={it.origin}>{it.origin}</p>
                  <p className="truncate text-[12px] text-ink-2">{typeLabel(it.identifierType)} · {it.identifier}</p>
                  {it.purpose && <p className="mt-1 line-clamp-2 text-[12px] text-ink-3">{it.purpose}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" aria-label={`Options pour ${it.label}`} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 hover:bg-soft hover:text-ink">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem variant="destructive" onSelect={() => setRemoving(it)}>
                      <Trash2 /> Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-line px-6 py-12 text-center">
            <p className="text-sm font-semibold text-ink">Aucune connexion confiée à {expertName}</p>
            <p className="mt-1 max-w-sm text-xs text-ink-3">Ajoutez l’accès à un site (portail administratif, banque, outil métier) et dites à quoi il sert.</p>
            <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="mt-4">
              <Plus /> Ajouter une connexion
            </Button>
          </div>
        )}
      </div>

      <VaultItemDialog open={adding} onOpenChange={setAdding} expertName={expertName} onSave={add} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Retirer la connexion"
        description={`Retirer « ${removing?.label ?? ""} » ? ${expertName} ne pourra plus se connecter à ce site.`}
        confirmText="Retirer"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
