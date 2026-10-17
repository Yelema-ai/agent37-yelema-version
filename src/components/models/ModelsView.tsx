"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { llmPending, type LlmOverview, type LlmWritten, type SettingScope } from "@/lib/llm";
import { scopeParam, type LlmSetup } from "@/lib/llm-accounts";
import { AccountsBoard, describe } from "./AccountsBoard";
import { ExpertModels } from "./ExpertModels";
import { MemberSources } from "./MemberSources";
import { useModelGroups } from "./useModelGroups";
import { YelemaEngine } from "./YelemaEngine";

const REFUSED = "Le fournisseur n’accepte plus cette clé. Vos experts ne répondent plus tant qu’elle n’est pas remplacée ou retirée.";
// Une pose prend d'ordinaire moins d'une minute par instance ; au-delà, on cesse de relire seul.
const POLL_MS = 4_000;
const POLL_TRIES = 45;
const EMPTY: LlmSetup = { groups: [], state: "applied" };

// Intégrations · Modèles : les comptes de l'instance, le modèle des experts, le moteur Yelema. L'écran
// affiche ce que le back-office sert et lui demande d'écrire ; il ne garde aucun secret.
export function ModelsView() {
  const [data, setData] = useState<LlmOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<SettingScope>({ kind: "own" });
  const [tries, setTries] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<LlmOverview>("/api/llm"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Tant qu'une pose est en cours, l'état est relu : l'écran passe seul à « En service » ou à l'échec.
  useEffect(() => {
    if (!data || !llmPending(data) || tries >= POLL_TRIES) return;
    const timer = setTimeout(() => {
      setTries((n) => n + 1);
      void load();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [data, tries, load]);

  const admin = data?.members !== undefined;
  // Un administrateur sans instance à lui regarde d'emblée les comptes partagés de l'entreprise.
  useEffect(() => {
    if (data && admin && !data.mine) setScope((s) => (s.kind === "own" ? { kind: "client" } : s));
  }, [data, admin]);

  const member = scope.kind === "member" ? data?.members?.find((m) => m.id === scope.id) : undefined;
  const setup = (scope.kind === "client" ? data?.clientSetup : scope.kind === "member" ? member?.setup : data?.setup) ?? EMPTY;
  const version = setup.groups.map((g) => `${g.provider}:${g.accounts.length}`).join(",");
  const models = useModelGroups(data ? scopeParam(scope) : null, undefined, version);

  const changed = useCallback(
    async (out?: LlmWritten | null) => {
      setTries(0);
      await load();
      if (out) toast.success("Modèle enregistré", { description: out.state === "pending" ? "L’installation sur l’instance est en cours." : undefined });
    },
    [load],
  );

  if (error && !data) return <p className="max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-[22px] border border-line bg-soft" />;

  const who = member?.name ?? member?.email ?? "ce membre";
  const title = scope.kind === "client" ? "Comptes partagés avec l’entreprise" : scope.kind === "member" ? `Comptes de l’instance de ${who}` : "Comptes de l’instance";
  const scopeLabel = scope.kind === "client" ? "les membres sans compte" : scope.kind === "member" ? `l’instance de ${who}` : "votre instance";
  const refused = (scope.kind === "member" ? member?.state : scope.kind === "own" ? data.mine?.state : undefined) === "refused";
  const catalogues = { catalogue: data.catalogue, logins: data.logins ?? [] };

  return (
    <div className="space-y-6">
      <p className="text-[15px] text-ink-2">Branchez vos comptes de modèles d’intelligence artificielle (BYOK) et choisissez le modèle de vos experts.</p>

      {refused && (
        <div role="alert" className="flex gap-2.5 rounded-[22px] border border-ko/30 bg-ko-pale p-4 text-sm text-ko">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{REFUSED}</p>
        </div>
      )}

      <AccountsBoard
        setup={setup}
        scope={scope}
        title={title}
        picker={admin && data.members ? <InstancePicker data={data} value={scope} onChange={setScope} /> : undefined}
        scopeLabel={scopeLabel}
        {...catalogues}
        customEndpoints={data.customEndpoints === true}
        canShare={admin && scope.kind !== "client"}
        models={models}
        onChanged={() => changed()}
      />

      <ExpertModels key={scopeParam(scope) ?? "own"} scope={scope} setup={setup} yelema={data.yelema} models={models} groupName={(g) => describe(g, catalogues).name} onChanged={changed} />

      {data.yelema && <YelemaEngine yelema={data.yelema} />}

      {admin && data.members && <MemberSources members={data.members} onPick={(id) => setScope({ kind: "member", id })} />}
    </div>
  );
}

// Le choix de l'instance regardée, compact, dans l'en-tête du bloc des comptes (admin seulement).
function InstancePicker({ data, value, onChange }: { data: LlmOverview; value: SettingScope; onChange: (scope: SettingScope) => void }) {
  const current = value.kind === "member" ? value.id : value.kind;
  return (
    <select
      aria-label="Instance réglée"
      value={current}
      onChange={(e) => onChange(e.target.value === "own" || e.target.value === "client" ? { kind: e.target.value } : { kind: "member", id: e.target.value })}
      className="h-7 max-w-[14rem] rounded-full border border-line bg-surface px-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
    >
      {data.mine && <option value="own">Mon instance</option>}
      <option value="client">Comptes partagés (entreprise)</option>
      {(data.members ?? []).map((m) => (
        <option key={m.id} value={m.id}>
          {m.name ?? m.email}
        </option>
      ))}
    </select>
  );
}
