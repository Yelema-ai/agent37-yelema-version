"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, PhoneCall, RefreshCw, Search } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { callDuration, findInText, transcriptOf, type CallRecord } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CallButton } from "./CallButton";

// The "Appels" tab of an expert: the member's calls with it, newest first, as a list across the page;
// a call opens its own page with « Retour » (as in Fireflies): its header with « Rappeler », then the
// summary (written by the expert once the call was over) on the left and the transcript on the
// right, always open, searchable and scrolling in its own column. On a phone, one under the other.
// The transcript is only lines the back office chose to serve (`transcript`, not served yet), never
// the raw transcript handed to the expert in its session. Pending ones are read again shortly.

const PENDING_POLL_MS = 15_000;

type Expert = { key: string; name: string; photoUrl: string | null };

const when = (iso: string) => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

const titleOf = (c: CallRecord) =>
  c.subject ?? (c.status === "open" ? "Appel en cours" : c.subjectPending ? "Compte rendu en cours de rédaction…" : c.status === "failed" ? "Appel interrompu" : "Sans sujet");

const metaOf = (c: CallRecord) => [when(c.startedAt), c.durationSeconds != null ? callDuration(c.durationSeconds) : "", c.language === "en" ? "en anglais" : ""].filter(Boolean).join(" · ");

export function ExpertCalls({ expert }: { expert: Expert }) {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The call whose page is open; null for the list.
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<{ items: CallRecord[] }>(`/api/voice/calls?expert=${encodeURIComponent(expert.key)}`);
      setCalls(r.items);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [expert.key]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = calls?.some((c) => c.subjectPending || c.status === "open") ?? false;
  useEffect(() => {
    if (!pending) return;
    const t = setInterval(() => void load(), PENDING_POLL_MS);
    return () => clearInterval(t);
  }, [pending, load]);

  const shown = calls?.find((c) => c.id === openId) ?? null;
  if (shown) return <CallPage call={shown} expert={expert} onBack={() => setOpenId(null)} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-lg font-bold text-ink">Appels avec {expert.name}</h2>
        <Button variant="ghost" size="sm" onClick={() => void load()} aria-label="Actualiser">
          <RefreshCw />
        </Button>
        <CallButton expert={expert} />
      </div>

      {error && <p className="text-sm text-ko">{error}</p>}
      {!calls && !error && (
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
        </p>
      )}
      {calls?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
          <PhoneCall className="h-6 w-6 text-ink-3" />
          <p className="text-sm text-ink-2">Aucun appel avec {expert.name} pour l’instant.</p>
        </div>
      )}
      {calls && calls.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" aria-label="Appels">
          {calls.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setOpenId(c.id)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-soft">
                <PhoneCall className="h-4 w-4 shrink-0 text-ink-3" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">{titleOf(c)}</span>
                  <span className="block text-[12px] text-ink-3">{metaOf(c)}</span>
                  {c.summary?.[0] && <span className="mt-0.5 block truncate text-[13px] text-ink-2">{c.summary[0]}</span>}
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CallPage({ call: c, expert, onBack }: { call: CallRecord; expert: Expert; onBack: () => void }) {
  const [query, setQuery] = useState("");
  const lines = transcriptOf(c);
  const hits = query.trim() ? lines.filter((l) => findInText(l.text, query).length) : lines;

  return (
    <section className="flex min-w-0 flex-col gap-4" aria-label={titleOf(c)}>
      <Button variant="ghost" size="sm" className="-ml-2 self-start" onClick={onBack}>
        <ChevronLeft />
        Retour
      </Button>
      <header className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-ink">{titleOf(c)}</h2>
          <p className="text-[12px] text-ink-3">{metaOf(c)}</p>
        </div>
        <CallButton expert={expert} label="Rappeler" />
      </header>

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="rounded-2xl border border-line bg-surface p-4 md:p-5">
          <h3 className="mb-2 text-[13px] font-bold text-ink">Résumé</h3>
          {c.summary?.length ? (
            <ul className="list-disc space-y-1.5 pl-4 text-sm text-ink-2">
              {c.summary.map((line, k) => (
                <li key={k}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">{c.subjectPending || c.status === "open" ? "Le résumé arrive dès que l’appel est terminé." : "Pas de résumé pour cet appel."}</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col rounded-2xl border border-line bg-surface md:max-h-[calc(100dvh-16rem)]">
          <div className="flex flex-col gap-3 border-b border-line p-4 md:px-5">
            <h3 className="flex items-baseline gap-2 text-[13px] font-bold text-ink">
              Transcription
              {lines.length > 0 && <span className="font-normal text-ink-3">{lines.length} répliques</span>}
            </h3>
            {lines.length > 0 && (
              <label className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm focus-within:border-brand">
                <Search className="size-4 shrink-0 text-ink-3" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher dans la transcription" aria-label="Rechercher dans la transcription" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3" />
              </label>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 md:px-5">
            {!lines.length ? (
              <p className="text-sm text-ink-3">Pas de transcription pour cet appel.</p>
            ) : hits.length ? (
              <div className="flex flex-col gap-3 text-sm">
                {hits.map((l, k) => (
                  <p key={k} className="text-ink-2">
                    <b className={cn("block text-[12px] font-semibold", l.who === "expert" ? "text-brand-ink" : "text-ink")}>{l.who === "expert" ? expert.name : "Vous"}</b>
                    <Marked text={l.text} query={query} />
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">Aucune réplique ne contient « {query.trim()} ».</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Marked({ text, query }: { text: string; query: string }) {
  const ranges = findInText(text, query);
  if (!ranges.length) return <>{text}</>;
  const parts: React.ReactNode[] = [];
  let at = 0;
  ranges.forEach(([s, e], k) => {
    parts.push(<Fragment key={`t${k}`}>{text.slice(at, s)}</Fragment>, <mark key={`m${k}`} className="rounded bg-tint px-0.5 text-ink">{text.slice(s, e)}</mark>);
    at = e;
  });
  parts.push(<Fragment key="end">{text.slice(at)}</Fragment>);
  return <>{parts}</>;
}
