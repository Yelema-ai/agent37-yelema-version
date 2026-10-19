"use client";

import { useEffect, useState } from "react";
import { AudioLines } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { VoicePrefs } from "@/lib/voice";
import { loadVoicePrefs, saveVoicePrefs } from "@/lib/voice-prefs";
import { useVoices } from "./useVoices";
import { VoiceSettings } from "./VoiceSettings";

/** "Voix" in an expert's menu: the language and voice its calls (and dictation) take. */
export function VoiceButton({ expert, className, compact = false }: { expert: { key: string; name: string }; className?: string; compact?: boolean }) {
  const voices = useVoices();
  const [open, setOpen] = useState(false);
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
      <Button variant="outline" size={compact ? "icon" : "sm"} className={className} onClick={() => setOpen(true)} aria-label={`Voix de ${expert.name}`} title={`Voix de ${expert.name}`}>
        <AudioLines />
        {!compact && "Voix"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogTitle>Voix de {expert.name}</DialogTitle>
          <DialogDescription>La langue et la voix de {expert.name} quand vous l’appelez ; la dictée de son chat suit la même langue.</DialogDescription>
          <VoiceSettings voices={voices} prefs={prefs} onChange={setPrefs} />
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
