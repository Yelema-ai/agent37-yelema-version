"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Pager } from "@/components/Pager";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { ExpertImage } from "@/components/experts/ExpertImage";
import { cn } from "@/lib/utils";
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

// Intégrations · Clés : les connexions confiées aux experts de SA propre instance, toujours un expert
// à la fois (Leslie, 24/10) : on choisit l'expert en haut, on voit et on ajoute ses clés.
export function VaultView() {
  // Each Expert by the name the member sees everywhere else (Djénéba, not « Djeneba »).
  const { experts } = useExpertsContext();
  const nameOf = (p: string) => experts.find((e) => e.profileId === p)?.displayName ?? profileLabel(p);
  const [data, setData] = useState<VaultOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setProfile] = useState<string | null>(null);
  // An Expert is always chosen: the first one holding keys (else the first) until the member picks another.
  const profile = chosen ?? experts_(data).find((p) => data && entriesOf(data.items, p).length > 0) ?? experts_(data)[0] ?? null;
  const photoOf = (p: string) => experts.find((e) => e.profileId === p)?.photoUrl ?? null;
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
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">{profile ? `Clés de ${nameOf(profile)}` : "Clés des experts"}</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-3">Confiez à un expert l’accès à un site : il s’y connecte pour vous, sans jamais voir le mot de passe.</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={!data || !profile} className="self-start sm:self-auto">
          <Plus /> {profile ? `Ajouter une clé pour ${nameOf(profile)}` : "Ajouter une clé"}
        </Button>
      </div>

      <div role="tablist" aria-label="Expert" className="flex flex-wrap gap-2">
        {experts_(data).map((p) => {
          const on = p === profile;
          const n = data ? entriesOf(data.items, p).length : 0;
          const photo = photoOf(p);
          return (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                setProfile(p);
                setPage(1);
              }}
              className={cn(
                "inline-flex h-11 items-center gap-2 rounded-full border py-1 pl-1 pr-3.5 text-[13.5px] font-semibold transition-colors",
                on ? "border-brand bg-tint text-brand-ink" : "border-line bg-surface text-ink-2 hover:bg-soft"
              )}
            >
              <span className="relative size-8 shrink-0 overflow-hidden rounded-full bg-soft">
                {photo && <ExpertImage src={photo} size={32} className="absolute inset-0 size-full object-cover object-[50%_20%]" />}
              </span>
              {nameOf(p)}
              {n > 0 && <span className="text-[12px] font-medium text-ink-3">{n}</span>}
            </button>
          );
        })}
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
          <p className="text-sm font-semibold text-ink">{profile ? `Aucune clé confiée à ${nameOf(profile)}` : "Aucune clé confiée à vos experts"}</p>
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
                  <th className="px-4 py-2.5 font-medium">Site</th>
                  <th className="px-4 py-2.5 font-medium">À quoi elle sert</th>
                  <th className="px-4 py-2.5 font-medium">Ajoutée le</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {shown.items.map((it) => (
                  <tr key={`${it.profile}:${it.id}`} className="border-t border-line align-top">
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
