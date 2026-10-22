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
const vaultUrl = (profile: string, handle?: string) => `/api/vault/own/${encodeURIComponent(profile)}${handle ? `/${encodeURIComponent(handle)}` : ""}`;

// Intégrations · Identifiants : les connexions confiées aux experts de SA propre instance. Une liste
// déroulante filtre par expert (aucun choix : toutes) ; chaque affichage relit le coffre de l'instance.
export function VaultView() {
  // Each Expert by the name the member sees everywhere else (Djénéba, not « Djeneba »).
  const { experts } = useExpertsContext();
  const nameOf = (p: string) => experts.find((e) => e.profileId === p)?.displayName ?? profileLabel(p);
  const [data, setData] = useState<VaultOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<VaultEntry | null>(null);

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

  const rows = data ? entriesOf(data.items, profile) : [];
  const shown = paginate(rows, page, PER_PAGE);

  async function add(target: string, draft: VaultDraft) {
    await apiFetch(vaultUrl(target), { method: "POST", body: JSON.stringify(draft) });
    toast.success(`Connexion « ${draft.label} » confiée à ${nameOf(target)}`);
    setAdding(false);
    await load();
  }

  async function remove() {
    if (!removing) return;
    await apiFetch(vaultUrl(removing.profile, removing.id), { method: "DELETE" });
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

      <label className="block max-w-xs space-y-1 text-xs font-semibold text-ink-3">
        <span>Expert</span>
        <select
          value={profile ?? ""}
          onChange={(e) => {
            setProfile(e.target.value || null);
            setPage(1);
          }}
          disabled={!data}
          className="block w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm font-normal text-ink"
        >
          <option value="">Tous les experts</option>
          {experts_(data).map((p) => (
            <option key={p} value={p}>
              {nameOf(p)}
            </option>
          ))}
        </select>
      </label>

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
          <p className="text-sm font-semibold text-ink">{profile ? `Aucune connexion confiée à ${nameOf(profile)}` : "Aucune connexion confiée à vos experts"}</p>
          <p className="mt-1 max-w-sm text-xs text-ink-3">Ajoutez l’accès à un site (portail administratif, banque, outil métier) et dites à quoi il sert.</p>
          <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="mt-4">
            <Plus /> Ajouter une connexion
          </Button>
        </div>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-soft text-left text-xs text-ink-3">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Expert</th>
                  <th className="px-4 py-2.5 font-medium">Libellé</th>
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="px-4 py-2.5 font-medium">À quoi elle sert</th>
                  <th className="px-4 py-2.5 font-medium">Ajoutée le</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.items.map((it) => (
                  <tr key={`${it.profile}:${it.id}`} className="border-t border-line align-top">
                    <td className="px-4 py-3 font-medium text-ink">{nameOf(it.profile)}</td>
                    <td className="px-4 py-3 text-ink">
                      {it.label}
                      {/* Ni l'identifiant ni l'adresse : seulement leur nature, rien qui se lise par-dessus l'épaule. */}
                      <span className="mt-0.5 flex items-center gap-1 text-[12px] text-ink-3">
                        <Lock className="size-3" /> {typeLabel(it.identifierType)} enregistré
                      </span>
                    </td>
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

      <VaultItemDialog open={adding} onOpenChange={setAdding} profile={profile} profiles={experts_(data)} nameOf={nameOf} onSave={add} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Retirer la connexion"
        description={`Retirer « ${removing?.label ?? ""} » ? ${removing ? nameOf(removing.profile) : "L’expert"} ne pourra plus se connecter à ce site.`}
        confirmText="Retirer"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
