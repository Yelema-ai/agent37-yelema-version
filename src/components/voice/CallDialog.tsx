"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Pause, Phone, PhoneOff, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { readVoicePrefs, VOICE_LANGUAGES, writeVoicePrefs, type VoiceOption, type VoicePrefs } from "@/lib/voice";
import { useVoiceCall, type CallPhase } from "./useVoiceCall";

const PHASE_LABEL: Record<CallPhase, string> = {
  idle: "",
  connecting: "Appel en cours…",
  listening: "Vous écoute",
  speaking: "Parle",
  reconnecting: "Reconnexion…",
  ended: "Appel terminé",
  unreachable: "Injoignable",
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function CallDialog({
  open,
  onOpenChange,
  expert,
  voices,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expert: { key: string; name: string; photoUrl: string | null };
  voices: VoiceOption[];
}) {
  const call = useVoiceCall();
  const [prefs, setPrefs] = useState<VoicePrefs>({ language: "fr", voices: {} });
  useEffect(() => setPrefs(readVoicePrefs()), []);
  const inCall = call.phase !== "idle" && call.phase !== "ended" && call.phase !== "unreachable";

  const choices = voices.filter((v) => v.language === prefs.language);
  const chosen = choices.find((v) => v.key === prefs.voices[prefs.language]) ?? choices.find((v) => v.default) ?? choices[0] ?? null;
  const update = (next: VoicePrefs) => {
    setPrefs(next);
    writeVoicePrefs(next);
  };

  const close = (next: boolean) => {
    if (!next && inCall) call.hangUp();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm" onInteractOutside={(e) => inCall && e.preventDefault()}>
        <div className="flex flex-col items-center gap-3 pt-2 text-center">
          <Portrait photoUrl={expert.photoUrl} name={expert.name} active={call.phase === "speaking"} />
          <DialogTitle className="text-lg">{expert.name}</DialogTitle>
          <DialogDescription className={cn("min-h-5 text-sm", call.phase === "unreachable" ? "text-ko" : "text-ink-3")}>
            {call.phase === "unreachable" ? call.reason : call.phase === "idle" ? "Appel vocal" : PHASE_LABEL[call.phase]}
            {(call.phase === "listening" || call.phase === "speaking") && ` · ${clock(call.elapsed)}`}
            {call.phase === "ended" && call.elapsed > 0 && ` · ${clock(call.elapsed)}`}
          </DialogDescription>
        </div>

        {!inCall && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-1 rounded-xl bg-soft p-1">
              {VOICE_LANGUAGES.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => update({ ...prefs, language: l.id })}
                  className={cn("flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold", prefs.language === l.id ? "bg-surface text-ink shadow-sm" : "text-ink-2")}
                >
                  {l.label}
                </button>
              ))}
            </div>
            {choices.length > 0 && (
              <VoicePicker voices={choices} value={chosen?.key ?? null} onChange={(key) => update({ ...prefs, voices: { ...prefs.voices, [prefs.language]: key } })} />
            )}
          </div>
        )}

        <div className="flex justify-center gap-3 pt-1">
          {inCall ? (
            <>
              <Button variant="outline" size="icon" className="rounded-full" onClick={() => call.setMuted(!call.muted)} aria-label={call.muted ? "Réactiver le micro" : "Couper le micro"}>
                {call.muted ? <MicOff /> : <Mic />}
              </Button>
              <Button variant="destructive" size="icon" className="rounded-full" onClick={call.hangUp} aria-label="Raccrocher">
                <PhoneOff />
              </Button>
            </>
          ) : (
            <Button onClick={() => call.start({ expert: expert.key, language: prefs.language, voice: chosen?.key ?? null })} disabled={choices.length === 0}>
              <Phone />
              {call.phase === "idle" ? "Appeler" : "Rappeler"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Portrait({ photoUrl, name, active }: { photoUrl: string | null; name: string; active: boolean }) {
  return (
    <span className={cn("relative grid size-24 place-items-center overflow-hidden rounded-full bg-tint text-3xl font-bold text-brand-ink ring-4 transition-shadow", active ? "ring-brand/60" : "ring-transparent")}>
      {photoUrl ? <img src={photoUrl} alt="" className="size-full object-cover object-top" /> : name.charAt(0)}
    </span>
  );
}

/** The voices of one language, each with its sample. */
function VoicePicker({ voices, value, onChange }: { voices: VoiceOption[]; value: string | null; onChange: (key: string) => void }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const listen = (v: VoiceOption) => {
    audio.current?.pause();
    if (playing === v.key) return setPlaying(null);
    const a = new Audio(v.previewUrl);
    a.onended = () => setPlaying(null);
    audio.current = a;
    setPlaying(v.key);
    a.play().catch(() => setPlaying(null));
  };
  return (
    <div className="max-h-56 overflow-y-auto rounded-xl border border-line">
      {voices.map((v) => (
        <div key={v.key} className={cn("flex items-center gap-2 border-b border-line px-3 py-2 last:border-b-0", value === v.key && "bg-tint")}>
          <button type="button" onClick={() => onChange(v.key)} className="flex min-w-0 flex-1 items-center gap-2 text-left" aria-pressed={value === v.key}>
            <span className={cn("size-3.5 shrink-0 rounded-full border-2", value === v.key ? "border-brand bg-brand" : "border-line")} />
            <span className="truncate text-sm font-semibold text-ink">{v.label}</span>
            <span className="text-[11px] text-ink-3">{v.gender === "female" ? "Femme" : v.gender === "male" ? "Homme" : "Neutre"}</span>
          </button>
          <button type="button" onClick={() => listen(v)} className="rounded-full p-1.5 text-ink-2 hover:bg-soft" aria-label={`Écouter ${v.label}`}>
            {playing === v.key ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}
