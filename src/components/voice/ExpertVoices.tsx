"use client";

import { useEffect, useState } from "react";
import { AudioLines } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { chosenVoice, countryFlag, countryName, VOICE_LANGUAGES, type VoicePrefs } from "@/lib/voice";
import { loadVoicePrefs } from "@/lib/voice-prefs";
import { VoiceButton } from "./VoiceButton";
import { useVoiceExpert } from "./useVoiceExpert";
import { useVoices } from "./useVoices";

// Intégrations · Voix : la voix de chaque Expert en appel, celle qu'il prend par défaut tant que la
// personne n'en a pas choisi une autre, et le même réglage que « Voix » sur la page de l'Expert.
export function ExpertVoices() {
  const { experts } = useExpertsContext();
  const voices = useVoices();
  const voiceExpert = useVoiceExpert();
  const callable = experts.filter((e) => e.catalogueKey);
  const [prefs, setPrefs] = useState<Record<string, VoicePrefs>>({});
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (editing === null)
      void Promise.all(callable.map(async (e) => [e.catalogueKey!, await loadVoicePrefs(e.catalogueKey!)] as const)).then(
        (rows) => live && setPrefs(Object.fromEntries(rows))
      );
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, callable.length]);

  if (voices.length === 0 || callable.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-[18px] font-bold tracking-tight text-ink">Voix de vos Experts en appel</h3>
        <p className="mt-1 max-w-xl text-sm text-ink-3">Celle que prend chaque Expert quand vous l’appelez.</p>
      </div>
      <div className="divide-y divide-line overflow-hidden rounded-[22px] border border-line bg-surface">
        {callable.map((e) => {
          const key = e.catalogueKey!;
          const p = prefs[key];
          const voice = p ? chosenVoice(voices, p, voiceExpert(key)) : null;
          const byDefault = p ? !p.voices[p.language] : false;
          const language = VOICE_LANGUAGES.find((l) => l.id === p?.language)?.label;
          return (
            <div key={`${e.agentId}:${e.profileId}`} className="flex items-center gap-3 px-4 py-3">
              <ExpertAvatar expert={{ ...e, gateway: null }} />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-1.5 text-[15px] font-semibold text-ink">
                  <span className="truncate">{e.displayName}</span>
                  {byDefault && <span className="shrink-0 rounded-full bg-soft px-1.5 py-0.5 text-[11px] font-semibold text-ink-2">par défaut</span>}
                </p>
                <p className="truncate text-[12.5px] text-ink-3">
                  {voice ? (
                    <>
                      <span className="font-semibold text-ink-2">{voice.label}</span> · {countryFlag(voice.country)} {countryName(voice.country)} · {language}
                    </>
                  ) : (
                    "…"
                  )}
                </p>
              </div>
              <Button variant="outline" size="sm" className="size-11 shrink-0 p-0 sm:size-auto sm:px-3" onClick={() => setEditing(key)} aria-label={`Changer la voix de ${e.displayName}`}>
                <AudioLines /> <span className="hidden sm:inline">Changer</span>
              </Button>
              {editing === key && (
                <VoiceButton expert={{ key, name: e.displayName }} open onOpenChange={(open) => !open && setEditing(null)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
