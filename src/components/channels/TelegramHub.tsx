"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { TelegramHubStatus } from "@/lib/agent37";

const POLL_MS = 4_000;

// Telegram d'une instance Claude Code, en un geste : Telegram fait créer au membre son propre bot
// (« bot géré » par Yelema), puis le hub de l'instance y ouvre un sujet par expert.
export function TelegramHub({ agentId, canManage }: { agentId: string; canManage: boolean }) {
  const [status, setStatus] = useState<TelegramHubStatus | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setStatus(await apiFetch<TelegramHubStatus>(`/api/agents/${agentId}/channels/telegram/hub`));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [agentId]);

  useEffect(() => void load(), [load]);

  // Après le lien, l'état est relu jusqu'à ce que le bot apparaisse sur l'instance.
  useEffect(() => {
    if (!waiting || status?.hub?.bot) return setWaiting(false);
    const t = setTimeout(() => void load(), POLL_MS);
    return () => clearTimeout(t);
  }, [waiting, status, load]);

  const connect = async () => {
    setBusy(true);
    try {
      const { url } = await apiFetch<{ url: string }>(`/api/agents/${agentId}/channels/telegram/hub`, { method: "POST", body: "{}" });
      if (/^https:\/\/t\.me\//.test(url)) window.open(url, "_blank", "noopener,noreferrer");
      setWaiting(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await apiFetch(`/api/agents/${agentId}/channels/telegram/hub`, { method: "DELETE" });
      toast.success("Telegram débranché");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!status) return <div className="h-24 animate-pulse rounded-lg border bg-card" />;
  if (!status.connected) return <p className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">Telegram n’est pas encore ouvert sur cette plateforme.</p>;

  const hub = status.hub;
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Telegram</p>
          <p className="text-xs text-muted-foreground">
            {hub?.bot ? <>Votre bot : <a className="font-semibold text-brand hover:underline" href={`https://t.me/${hub.bot}`} target="_blank" rel="noopener noreferrer">@{hub.bot}</a></> : "Un bot à vous, créé en un geste dans Telegram ; chaque expert y a son sujet."}
          </p>
        </div>
        {canManage &&
          (hub?.bot ? (
            <Button variant="outline" onClick={() => void disconnect()} disabled={busy}>Débrancher</Button>
          ) : (
            <Button onClick={() => void connect()} disabled={busy || waiting}>
              {busy || waiting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{waiting ? "En attente de Telegram…" : "Ouverture…"}</> : "Connecter Telegram"}
            </Button>
          ))}
      </div>
      {waiting && !hub?.bot && <p className="text-xs text-muted-foreground">Dans Telegram : appuyez sur Démarrer, puis sur « Créer mon bot Yelema » et confirmez.</p>}
      {hub?.bot && !hub.started && (
        <p className="text-xs text-muted-foreground">
          Dernière étape : ouvrez <a className="inline-flex items-center gap-1 font-semibold text-brand hover:underline" href={`https://t.me/${hub.bot}?start=yelema`} target="_blank" rel="noopener noreferrer">@{hub.bot} <ExternalLink className="h-3 w-3" /></a> et appuyez sur Démarrer : les sujets des experts se créent aussitôt.
        </p>
      )}
      {hub?.started && hub.mode === "topics" && <p className="text-xs text-muted-foreground">{hub.topics?.length ?? 0} expert(s) ont leur sujet dans la conversation avec le bot.</p>}
      {hub?.started && hub.mode === "single" && <p className="text-xs text-muted-foreground">Choisissez l’expert à qui parler avec le menu des commandes du bot (/).</p>}
    </div>
  );
}
