"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { TelegramHubStatus } from "@/lib/agent37";
import { DisconnectButton } from "@/components/channels/DisconnectButton";

const POLL_MS = 4_000;
const TG_LINK = /^https:\/\/t\.me\//;

// Telegram d'une instance (Hermes ou Claude Code), par le bot gestionnaire de Yelema : le membre crée SON
// bot en un geste, l'ajoute à un groupe à sujets, et chaque expert y reçoit son sujet. Tant qu'une étape
// attend Telegram, l'état est relu ; `onUnavailable` masque le bloc là où la passerelle ne l'offre pas.
export function TelegramHub({ agentId, canManage, onUnavailable, onState, hideWhenEmpty }: { agentId: string; canManage: boolean; onUnavailable?: () => void; onState?: (state: TelegramHubStatus["state"]) => void; hideWhenEmpty?: boolean }) {
  const [status, setStatus] = useState<TelegramHubStatus | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState<"link" | "sync" | "off" | null>(null);
  const [copied, setCopied] = useState(false);
  const base = `/api/agents/${agentId}/channels/telegram/hub`;

  const load = useCallback(async () => {
    try {
      const next = await apiFetch<TelegramHubStatus>(base);
      setStatus(next);
      onState?.(next.state);
    } catch {
      onUnavailable?.();
    }
  }, [base, onUnavailable, onState]);

  useEffect(() => void load(), [load]);

  const phase = status?.state?.phase;
  useEffect(() => {
    if (!(waiting || phase === "awaiting_group" || phase === "needs_topics")) return;
    const t = setTimeout(() => void load(), POLL_MS);
    return () => clearTimeout(t);
  }, [waiting, phase, status, load]);
  useEffect(() => {
    if (phase) setWaiting(false);
  }, [phase]);

  const act = async (what: NonNullable<typeof busy>, fn: () => Promise<void>) => {
    setBusy(what);
    try {
      await fn();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const connect = () =>
    act("link", async () => {
      const { url } = await apiFetch<{ url: string }>(base, { method: "POST", body: "{}" });
      if (TG_LINK.test(url)) window.open(url, "_blank", "noopener,noreferrer");
      setWaiting(true);
    });
  const sync = () =>
    act("sync", async () => {
      const out = await apiFetch<{ topics: number }>(`${base}/sync`, { method: "POST" });
      toast.success(`Sujets à jour (${out.topics})`);
      await load();
    });
  const disconnect = () =>
    act("off", async () => {
      await apiFetch(base, { method: "DELETE" });
      toast.success("Telegram déconnecté");
      await load();
    });
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!status) return hideWhenEmpty ? null : <div className="h-24 animate-pulse rounded-lg border bg-card" />;
  if (!status.connected || (hideWhenEmpty && !status.state)) return null;
  const s = status.state;
  const topicCount = Object.keys(s?.topics ?? {}).length;

  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">Telegram</p>
          {s?.phase !== "ready" && <p className="text-xs text-muted-foreground">
            {s ? <>Bot : <a className="font-semibold text-brand hover:underline" href={`https://t.me/${s.bot}`} target="_blank" rel="noopener noreferrer">@{s.bot}</a>{s.chatTitle ? <> · groupe « {s.chatTitle} »</> : null}</> : "Un bot à vous et un groupe où chaque expert a son sujet."}
          </p>}
        </div>
        {canManage && !s && (
          <Button onClick={() => void connect()} disabled={busy !== null || waiting}>
            {busy === "link" || waiting ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{waiting ? "En attente de Telegram…" : "Ouverture…"}</> : "Connecter Telegram"}
          </Button>
        )}
      </div>

      {!s && waiting && <p className="text-xs text-muted-foreground">Dans Telegram : appuyez sur Démarrer, puis sur « Créer mon bot Yelema » et confirmez.</p>}

      {s && s.phase !== "ready" && (
        <ol className="list-decimal space-y-1.5 pl-5 text-xs text-muted-foreground">
          <li>Créez un groupe Telegram et activez-y les <span className="font-semibold">Sujets</span> (réglages du groupe).</li>
          <li>
            {s.groupUrl && TG_LINK.test(s.groupUrl) ? (
              <a className="inline-flex items-center gap-1 font-semibold text-brand hover:underline" href={s.groupUrl} target="_blank" rel="noopener noreferrer">Ajouter le bot à mon groupe <ExternalLink className="h-3 w-3" /></a>
            ) : "Ajoutez le bot au groupe"}
            {" "}puis choisissez ce groupe.
          </li>
          {s.phase === "needs_topics" && <li className="font-semibold">Le bot est dans le groupe : activez maintenant les Sujets.</li>}
          <li><span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Chaque expert reçoit son sujet dès que c’est fait.</span></li>
        </ol>
      )}

      {/* Connected: the group, the experts' topics, the colleagues to invite, then the way out. */}
      {s?.phase === "ready" && (
        <div className="space-y-2">
          <Block title="Votre groupe">
            <p className="text-sm text-ink-2">
              {s.chatTitle ? <>« {s.chatTitle} » avec </> : null}
              <a className="font-semibold text-brand hover:underline" href={`https://t.me/${s.bot}`} target="_blank" rel="noopener noreferrer">@{s.bot}</a>
            </p>
          </Block>
          <Block
            title="Sujets des Experts"
            action={
              canManage && (
                <Button variant="outline" size="sm" onClick={() => void sync()} disabled={busy !== null} className="max-sm:h-10">
                  {busy === "sync" ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                  Mettre à jour
                </Button>
              )
            }
          >
            <p className="text-sm text-ink-2">
              {topicCount > 1 ? `${topicCount} Experts ont leur sujet` : topicCount === 1 ? "1 Expert a son sujet" : "Aucun sujet pour l’instant"}
            </p>
          </Block>
          {s.inviteLink && TG_LINK.test(s.inviteLink) && (
            <Block
              title="Inviter des collègues"
              action={
                <Button variant="outline" size="sm" onClick={() => void copy(s.inviteLink!)} className="max-sm:h-10">
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Lien copié" : "Copier le lien"}
                </Button>
              }
            >
              <p className="text-sm text-ink-2">Ils écrivent à vos Experts dans le même groupe.</p>
            </Block>
          )}
          {canManage && (
            <div className="flex justify-end pt-2">
              <DisconnectButton name="Telegram" onConfirm={disconnect} disabled={busy !== null} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-soft px-4 py-3">
      <div className="min-w-0">
        <h4 className="text-[13px] font-semibold text-ink-3">{title}</h4>
        {children}
      </div>
      {action}
    </section>
  );
}
