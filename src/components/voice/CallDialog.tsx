"use client";

import { useEffect, useRef } from "react";
import { Brain, Hand, Mic, MicOff, Phone, PhoneOff, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { HALO_PULSE_MS, HALO_RGB, haloOf, type CallPhase } from "@/lib/call-turns";
import { chosenVoice, type VoiceOption } from "@/lib/voice";
import { loadVoicePrefs } from "@/lib/voice-prefs";
import { faceProps, FACE_PX } from "./face";
import { useRingback } from "./useRingback";
import { useVoiceCall } from "./useVoiceCall";

const PHASE_LABEL: Record<CallPhase, string> = {
  idle: "",
  connecting: "Appel en cours…",
  listening: "Vous écoute",
  thinking: "Réfléchit…",
  speaking: "Parle",
  reconnecting: "Reconnexion…",
  ended: "Appel terminé",
  unreachable: "Injoignable",
};

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const inCallPhase = (p: CallPhase) => p !== "idle" && p !== "ended" && p !== "unreachable";

/** Opening it calls at once, in the language and voice chosen ahead for this expert. */
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
  const voice = useRef<VoiceOption | null>(null);
  const inCall = inCallPhase(call.phase);
  useRingback(open && call.phase === "connecting");

  const dial = async () => {
    const prefs = await loadVoicePrefs(expert.key);
    voice.current = chosenVoice(voices, prefs);
    call.start({ expert: expert.key, language: prefs.language, voice: voice.current?.key ?? null });
  };

  useEffect(() => {
    if (open) void dial();
  }, [open]);

  const close = (next: boolean) => {
    if (!next && inCall) call.hangUp();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()} onInteractOutside={(e) => inCall && e.preventDefault()}>
        <CallView
          name={expert.name}
          photoUrl={expert.photoUrl}
          phase={call.phase}
          reason={call.reason}
          muted={call.muted}
          longer={call.longer}
          holding={call.holding}
          elapsed={call.elapsed}
          voiceLabel={voice.current?.label ?? null}
          onMute={() => call.setMuted(!call.muted)}
          onHangUp={call.hangUp}
          onLonger={() => toast(call.toggleLonger() ? `${expert.name} prendra le temps de chercher.` : "Réponses rapides.")}
          onHold={() => toast(call.toggleHold() ? `${expert.name} attend que vous ayez fini.` : `${expert.name} peut reprendre la parole.`)}
          onClose={() => onOpenChange(false)}
          onRedial={dial}
        />
      </DialogContent>
    </Dialog>
  );
}

/** The call as shown, from its state alone: the dialog wires it to the live call. */
export function CallView(p: {
  name: string;
  photoUrl: string | null;
  phase: CallPhase;
  reason: string | null;
  muted: boolean;
  longer: boolean;
  holding: boolean;
  elapsed: number;
  voiceLabel: string | null;
  onMute: () => void;
  onHangUp: () => void;
  onLonger: () => void;
  onHold: () => void;
  onClose: () => void;
  onRedial: () => void;
}) {
  const inCall = inCallPhase(p.phase);
  const status = p.phase === "unreachable" ? p.reason : p.muted && (p.phase === "listening" || p.phase === "speaking") ? "Micro coupé" : PHASE_LABEL[p.phase];
  const timed = p.phase === "listening" || p.phase === "speaking" || p.phase === "thinking" || (p.phase === "ended" && p.elapsed > 0);
  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <Portrait photoUrl={p.photoUrl} name={p.name} phase={p.phase} muted={p.muted} />
        <DialogTitle className="text-lg">{p.name}</DialogTitle>
        <DialogDescription aria-live="polite" className={cn("min-h-5 text-sm", p.phase === "unreachable" ? "text-ko" : "text-ink-3")}>
          {status}
          {timed && ` · ${clock(p.elapsed)}`}
        </DialogDescription>
        {p.voiceLabel && <p className="text-[12px] text-ink-3">Voix : {p.voiceLabel} · se change dans « Voix », sous Appeler</p>}
      </div>

      {inCall && (
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          <Pill icon={Brain} label="Réfléchis plus longtemps" on={p.longer} onClick={p.onLonger} />
          <Pill icon={Hand} label="Laisse-moi finir" on={p.holding} onClick={p.onHold} />
        </div>
      )}

      <div className="flex justify-center gap-3 pt-1">
        {inCall ? (
          <>
            <Button variant="outline" size="icon" className="size-12 rounded-full" onClick={p.onMute} aria-label={p.muted ? "Réactiver le micro" : "Couper le micro"} aria-pressed={p.muted}>
              {p.muted ? <MicOff /> : <Mic />}
            </Button>
            <Button variant="destructive" size="icon" className="size-12 rounded-full" onClick={p.onHangUp} aria-label="Raccrocher">
              <PhoneOff />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={p.onClose}>
              Fermer
            </Button>
            <Button onClick={p.onRedial}>
              <Phone />
              Rappeler
            </Button>
          </>
        )}
      </div>
    </>
  );
}

function Pill({ icon: Icon, label, on, onClick }: { icon: LucideIcon; label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors",
        on ? "border-brand bg-brand text-on-brand" : "border-line bg-surface text-ink-2 hover:bg-soft"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.8} />
      {label}
    </button>
  );
}

// The expert in large, a halo around it in the colour of the moment (src/lib/call-turns.ts), as on
// the mobile app; a turning ring while it thinks, the picture dimmed while the line reconnects.
const GROW = 56;

function Portrait({ photoUrl, name, phase, muted }: { photoUrl: string | null; name: string; phase: CallPhase; muted: boolean }) {
  const halo = haloOf(phase, muted);
  const rgb = halo ? HALO_RGB[halo] : null;
  const pulse = halo ? HALO_PULSE_MS[halo] : null;
  const anim = pulse ? ({ animation: `call-halo ${pulse * 2}ms ease-in-out infinite` } as const) : undefined;
  const face = photoUrl ? faceProps(photoUrl) : null;
  return (
    <span className="relative grid place-items-center" style={{ width: FACE_PX + GROW, height: FACE_PX + GROW }} data-halo={halo ?? "aucun"}>
      {rgb && (
        <>
          <span aria-hidden className="call-halo absolute inset-0 rounded-full transition-colors duration-300" style={{ backgroundColor: `rgba(${rgb},0.30)`, boxShadow: `0 0 48px rgba(${rgb},0.75)`, ...anim }} />
          <span aria-hidden className="call-halo absolute rounded-full transition-colors duration-300" style={{ inset: GROW / 2 - 8, backgroundColor: `rgba(${rgb},0.85)`, ...anim }} />
        </>
      )}
      {halo === "reflechit" && (
        <span aria-hidden className="absolute animate-spin rounded-full border-[3px] border-transparent motion-reduce:animate-none" style={{ inset: GROW / 2 - 16, borderTopColor: `rgb(${rgb})`, borderRightColor: `rgb(${rgb})`, animationDuration: "1.4s" }} />
      )}
      <span
        className={cn("relative grid place-items-center overflow-hidden rounded-full bg-tint text-5xl font-bold text-brand-ink transition-[filter] duration-300", halo === "reco" && "brightness-60 grayscale-[0.7]")}
        style={{ width: FACE_PX, height: FACE_PX }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {face ? <img {...face} className="size-full object-cover object-[50%_18%]" /> : name.charAt(0)}
      </span>
    </span>
  );
}
