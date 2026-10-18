"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, PhoneCall, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { callDuration, transcriptOf, type CallRecord } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CallButton } from "./CallButton";

// The "Appels" tab of an expert: the member's calls with it, newest first, each with the subject and
// summary the expert wrote once the call was over. Each ended call has two tabs, as on the mobile app:
// « Résumé » and « Transcription ». The second shows only lines the back office chose to serve
// (`transcript`, not served yet), never the raw transcript handed to the expert in its session.
// Pending ones are read again shortly.

const PENDING_POLL_MS = 15_000;

const when = (iso: string) => {
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? "" : at.toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function ExpertCalls({ expert }: { expert: { key: string; name: string; photoUrl: string | null } }) {
  const [calls, setCalls] = useState<CallRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {calls.map((c) => (
            <CallRow key={c.id} call={c} expertName={expert.name} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CallRow({ call: c, expertName }: { call: CallRecord; expertName: string }) {
  const [tab, setTab] = useState<"resume" | "transcription">("resume");
  const ended = c.status === "ended" && !c.subjectPending;
  const lines = transcriptOf(c);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">
          {c.subject ?? (c.status === "open" ? "Appel en cours" : c.subjectPending ? "Compte rendu en cours de rédaction…" : c.status === "failed" ? "Appel interrompu" : "Sans sujet")}
        </p>
        <p className="text-[12px] text-ink-3">
          {when(c.startedAt)}
          {c.durationSeconds != null && ` · ${callDuration(c.durationSeconds)}`}
          {c.language === "en" && " · en anglais"}
        </p>
        {ended && (
          <div role="tablist" aria-label="Compte rendu de l’appel" className="mt-2 inline-flex rounded-full bg-soft p-0.5">
            {(
              [
                ["resume", "Résumé"],
                ["transcription", "Transcription"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                onClick={() => setTab(value)}
                className={cn("min-h-9 rounded-full px-3.5 text-[13px] font-semibold transition-colors", tab === value ? "bg-surface text-ink shadow-sm" : "text-ink-3 hover:text-ink-2")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {(!ended || tab === "resume") && c.summary?.length ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[13px] text-ink-2">
            {c.summary.map((line, k) => (
              <li key={k}>{line}</li>
            ))}
          </ul>
        ) : null}
        {ended && tab === "transcription" && (
          <div role="tabpanel" className="mt-2 flex flex-col gap-1.5 text-[13px]">
            {lines.length ? (
              lines.map((l, k) => (
                <p key={k} className="text-ink-2">
                  <b className={cn("font-semibold", l.who === "expert" ? "text-brand-ink" : "text-ink")}>{l.who === "expert" ? expertName : "Vous"}</b> {l.text}
                </p>
              ))
            ) : (
              <p className="text-ink-3">Pas de transcription pour cet appel.</p>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
