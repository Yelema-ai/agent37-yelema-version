"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, MessageCircle, Unplug } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import { expertDisplayName } from "@/lib/experts";
import type { UnipileAccount, UnipileStatus } from "@/lib/unipile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// WhatsApp et messageries : le compte Unipile de la personne. Elle saisit le DSN et la clé que
// Unipile lui donne et choisit les Experts qui pourront lire ses discussions et écrire en son nom ;
// la clé part à son instance et ne revient jamais à l'écran.
export function UnipileCard() {
  const [status, setStatus] = useState<UnipileStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [dsn, setDsn] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [experts, setExperts] = useState<string[]>([]);
  const [tested, setTested] = useState<UnipileAccount[] | null>(null);
  const [busy, setBusy] = useState<"test" | "save" | "clear" | null>(null);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<UnipileStatus>("/api/unipile"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => void load(), [load]);

  const open = () => {
    setEditing(true);
    setApiKey("");
    setTested(null);
    setExperts(status?.experts.length ? status.experts : (status?.available.slice(0, 1) ?? []));
  };
  const draft = () => JSON.stringify({ dsn, apiKey, experts });
  const act = async (kind: "test" | "save" | "clear", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const test = () => act("test", async () => setTested((await apiFetch<{ accounts: UnipileAccount[] }>("/api/unipile/test", { method: "POST", body: draft() })).accounts));
  const save = () =>
    act("save", async () => {
      setStatus(await apiFetch<UnipileStatus>("/api/unipile", { method: "PUT", body: draft() }));
      setEditing(false);
      setApiKey("");
      toast.success("Messagerie branchée");
    });
  const clear = () =>
    act("clear", async () => {
      await apiFetch("/api/unipile", { method: "DELETE" });
      toast.success("Messagerie débranchée");
      await load();
    });
  const toggle = (p: string) => setExperts((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]));
  const ready = dsn.trim() && apiKey.trim() && experts.length > 0;

  return (
    <div className="rounded-[22px] border bg-card py-3 pl-4 pr-3">
      <div className="flex min-h-[52px] items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-ok-pale text-ok">
          <MessageCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink">WhatsApp et messageries (Unipile)</p>
          <p className="text-[13px] text-ink-3">Vos Experts lisent vos discussions et écrivent en votre nom, seulement quand vous le leur demandez.</p>
        </div>
        {status === null && !error ? (
          <span className="h-8 w-24 shrink-0 animate-pulse rounded-[10px] bg-soft" />
        ) : status?.connected ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-pale px-2.5 py-1 text-xs font-semibold text-ok">
            <Check className="h-3.5 w-3.5" />
            Connecté
          </span>
        ) : status && !editing ? (
          <Button size="sm" className="shrink-0" onClick={open}>
            Connecter
          </Button>
        ) : null}
      </div>

      {error && <p className="mt-2 border-t pt-2 text-[13px] text-ink-3">{error}</p>}

      {status?.connected && !editing && (
        <div className="mt-2 space-y-1.5 border-t pt-2 text-[13px]">
          {status.accounts.map((a) => (
            <p key={a.id} className="text-ink-2">
              {a.type || "Compte"} · {a.name}
              {a.status && <span className="text-ink-3"> · {a.status}</span>}
            </p>
          ))}
          {status.accountsError && <p className="text-ink-3">Unipile ne répond pas avec cette clé : reconnectez-la.</p>}
          <p className="text-ink-3">Experts : {status.experts.map(expertDisplayName).join(", ") || "aucun"}</p>
          <div className="flex gap-1 pt-1">
            <Button size="sm" variant="outline" onClick={open} disabled={busy !== null}>
              Modifier
            </Button>
            <button
              type="button"
              onClick={() => void clear()}
              disabled={busy !== null}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-ink-3 transition-colors hover:bg-soft hover:text-destructive disabled:opacity-60"
            >
              {busy === "clear" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Unplug className="h-3.5 w-3.5" />}
              Déconnecter
            </button>
          </div>
        </div>
      )}

      {editing && status && (
        <div className="mt-2 space-y-3 border-t pt-3 text-[13px]">
          <p className="text-ink-3">
            Dans votre tableau de bord Unipile, reliez votre WhatsApp, puis copiez le DSN et créez une clé d’API.
          </p>
          <label className="block space-y-1">
            <span className="font-semibold text-ink-2">DSN</span>
            <Input value={dsn} onChange={(e) => setDsn(e.target.value)} placeholder="api8.unipile.com:13851" autoComplete="off" />
          </label>
          <label className="block space-y-1">
            <span className="font-semibold text-ink-2">Clé d’API</span>
            <Input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={status.connected ? "Saisissez-la de nouveau" : ""} autoComplete="new-password" />
          </label>
          <div className="space-y-1">
            <span className="font-semibold text-ink-2">Experts qui y ont accès</span>
            <div className="flex flex-wrap gap-2">
              {status.available.map((p) => (
                <label key={p} className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-ink-2">
                  <input type="checkbox" checked={experts.includes(p)} onChange={() => toggle(p)} />
                  {expertDisplayName(p)}
                </label>
              ))}
            </div>
          </div>
          {tested && (
            <p className="text-ink-2">
              {tested.length ? `Comptes trouvés : ${tested.map((a) => `${a.type} · ${a.name}`).join(", ")}` : "La clé marche, mais aucun compte n’est relié chez Unipile."}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void test()} disabled={!ready || busy !== null}>
              {busy === "test" && <Loader2 className="animate-spin" />}
              Tester
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!ready || busy !== null}>
              {busy === "save" && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy !== null}>
              Annuler
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
