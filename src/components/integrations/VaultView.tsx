"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { paginate } from "@/lib/paginate";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { IDENTIFIER_TYPES, INSTANCE_PROFILE, entriesOf, profileLabel, type VaultDraft, type VaultEntry, type VaultOverview } from "@/lib/vault";
import { VaultItemDialog } from "./VaultItemDialog";

const PER_PAGE = 10;
const typeLabel = (t: VaultEntry["identifierType"]) => IDENTIFIER_TYPES.find((x) => x.value === t)?.label ?? t;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—");
// The Experts only: the instance's own profile is not one to pick.
const experts_ = (data: VaultOverview | null) => (data?.profiles ?? []).filter((p) => p !== INSTANCE_PROFILE);
// The same key held by several experts: one row, its entries kept to remove it everywhere.
type KeyGroup = VaultEntry & { key: string; entries: VaultEntry[] };
function groupKeys(items: VaultEntry[]): KeyGroup[] {
  const groups = new Map<string, KeyGroup>();
  for (const it of items) {
    const k = [it.label, it.origin, it.identifierType].join("|");
    const g = groups.get(k);
    if (g) g.entries.push(it);
    else groups.set(k, { ...it, key: k, entries: [it] });
  }
  return [...groups.values()];
}
const vaultUrl = (profile: string, handle?: string) => `/api/vault/own/${encodeURIComponent(profile)}${handle ? `/${encodeURIComponent(handle)}` : ""}`;

// Intégrations · Clés : les connexions confiées aux experts de SA propre instance, en une liste (Leslie,
// 24/10) : une clé pour tous les experts ou pour certains. Le coffre est par expert : une même clé
// posée chez plusieurs y figure une fois par expert, et la liste la montre une fois, avec qui l'a.
export function VaultView() {
  // Each Expert by the name the member sees everywhere else (Djénéba, not « Djeneba »).
  const { experts } = useExpertsContext();
  const nameOf = (p: string) => experts.find((e) => e.profileId === p)?.displayName ?? profileLabel(p);
  const [data, setData] = useState<VaultOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<KeyGroup | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<VaultOverview>("/api/vault/own"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const all = experts_(data);
  const rows = data ? groupKeys(entriesOf(data.items, null)) : [];
  const holders = (g: KeyGroup) => (all.length > 1 && all.every((p) => g.entries.some((e) => e.profile === p)) ? "Tous les experts" : g.entries.map((e) => nameOf(e.profile)).join(", "));
  const shown = paginate(rows, page, PER_PAGE);

  // One call per expert: the vault has no shared key.
  async function add(targets: string[], draft: VaultDraft) {
    for (const t of targets) await apiFetch(vaultUrl(t), { method: "POST", body: JSON.stringify(draft) });
    toast.success(`Clé « ${draft.label} » confiée à ${targets.length === all.length && all.length > 1 ? "tous les experts" : targets.map(nameOf).join(", ")}`);
    setAdding(false);
    await load();
  }

  async function remove() {
    if (!removing) return;
    for (const e of removing.entries) await apiFetch(vaultUrl(e.profile, e.id), { method: "DELETE" });
    toast.success(`Clé « ${removing.label} » retirée`);
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Clés des experts</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-3">Confiez à un expert l’accès à un site : il s’y connecte pour vous, sans jamais voir le mot de passe.</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={!data || all.length === 0} className="self-start sm:self-auto">
          <Plus /> Ajouter une clé
        </Button>
      </div>


      <div className="flex items-start gap-3.5 rounded-[22px] border border-line bg-surface p-4 text-sm text-ink-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-brand">
          <Lock className="h-5 w-5" />
        </div>
        <p className="text-xs leading-relaxed text-ink-3">
          Les mots de passe sont chiffrés dans le coffre de votre instance. Yelema ne les garde pas et ne les affiche jamais. Pas de double authentification : choisissez un compte qui n’en demande pas. L’expert ne remplit que les pages du site exact enregistré.
        </p>
      </div>

      {error && !data ? (
        <p className="max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p>
      ) : !data ? (
        <div className="flex min-h-[10rem] flex-col items-center justify-center gap-2 rounded-lg border border-line bg-surface p-8 text-xs text-ink-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          Lecture du coffre de l’instance…
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-12 text-center">
          <p className="text-sm font-semibold text-ink">Aucune clé confiée à vos experts</p>
          <p className="mt-1 max-w-sm text-xs text-ink-3">Ajoutez l’accès à un site (portail administratif, banque, outil métier) et dites à quoi il sert.</p>
          <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="mt-4">
            <Plus /> Ajouter une clé
          </Button>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-soft text-left text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  <th className="px-4 py-2.5 font-medium">Experts</th>
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="px-4 py-2.5 font-medium">À quoi elle sert</th>
                  <th className="px-4 py-2.5 font-medium">Ajoutée le</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.items.map((it) => (
                  <tr key={it.key} className="border-t border-line align-top">
                    <td className="px-4 py-3 text-ink">
                      {it.label}
                      {/* Ni l'identifiant ni l'adresse : seulement leur nature, rien qui se lise par-dessus l'épaule. */}
                      <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3">
                        <Lock className="size-3" /> {typeLabel(it.identifierType)} enregistré
                      </span>
                    </td>
                    <td className="max-w-[180px] px-4 py-3 text-ink-2">{holders(it)}</td>
                    <td className="max-w-[220px] truncate px-4 py-3 font-mono text-[12px] text-ink-2" title={it.origin}>{it.origin}</td>
                    <td className="max-w-[260px] px-4 py-3 text-ink-3">{it.purpose || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-3">{day(it.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setRemoving(it)} aria-label={`Retirer ${it.label}`}>
                        <Trash2 /> Retirer
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={shown} total={rows.length} size={PER_PAGE} onPage={setPage} />
        </div>
      )}

      <VaultItemDialog open={adding} onOpenChange={setAdding} profiles={all} nameOf={nameOf} onSave={add} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Retirer la connexion"
        description={`Retirer « ${removing?.label ?? ""} » ? ${removing ? holders(removing) : "Les experts"} ne pourront plus se connecter à ce site.`}
        confirmText="Retirer"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
