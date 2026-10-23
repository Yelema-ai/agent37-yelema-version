"use client";

import { useEffect, useState } from "react";
import { AudioLines } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { VoicePrefs } from "@/lib/voice";
import { loadVoicePrefs, saveVoicePrefs } from "@/lib/voice-prefs";
import { useVoiceExpert } from "./useVoiceExpert";
import { useVoices } from "./useVoices";
import { VoiceSettings } from "./VoiceSettings";

/** "Voix" in an expert's menu: the language and voice its calls (and dictation) take. */
export function VoiceButton({
  expert,
  className,
  compact = false,
  open: openProp,
  onOpenChange,
}: {
  expert: { key: string; name: string };
  className?: string;
  compact?: boolean;
  /** Opened from elsewhere (an expert's menu on a phone): no button of its own. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const voices = useVoices();
  const voiceExpert = useVoiceExpert();
  const [openOwn, setOpenOwn] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openOwn;
  const setOpen = (v: boolean) => (controlled ? onOpenChange?.(v) : setOpenOwn(v));
  const [prefs, setPrefs] = useState<VoicePrefs>({ language: "fr", voices: {} });
  useEffect(() => {
    let live = true;
    if (open) void loadVoicePrefs(expert.key).then((p) => live && setPrefs(p));
    return () => {
      live = false;
    };
  }, [open, expert.key]);
  if (voices.length === 0) return null;

  const save = async () => {
    try {
      await saveVoicePrefs(expert.key, prefs);
      toast.success(`Voix de ${expert.name} enregistrée.`);
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La voix n’a pas pu être enregistrée.");
    }
  };

  return (
    <>
      {!controlled && (
        <Button variant="outline" size={compact ? "icon" : "sm"} className={className} onClick={() => setOpen(true)} aria-label={`Voix de ${expert.name}`} title={`Voix de ${expert.name}`}>
          <AudioLines />
          {!compact && "Voix"}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Voix de {expert.name}</DialogTitle>
          <DialogDescription>La langue et la voix de {expert.name} quand vous l’appelez ; la dictée de son chat suit la même langue.</DialogDescription>
          <VoiceSettings voices={voices} prefs={prefs} onChange={setPrefs} expert={voiceExpert(expert.key)} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button onClick={() => void save()}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
