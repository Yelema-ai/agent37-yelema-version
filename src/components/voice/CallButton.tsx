"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import type { VoiceOption } from "@/lib/voice";
import { CallDialog } from "./CallDialog";

// Read once per page: the voices only change when Yelema adds some.
let voicesOnce: Promise<VoiceOption[]> | null = null;
const loadVoices = () =>
  (voicesOnce ??= apiFetch<{ items: VoiceOption[] }>("/api/voice/voices").then(
    (r) => r.items,
    () => []
  ));

/** "Appeler" for one expert; absent where voice calls are off (no voice offered). */
export function CallButton({ expert, className }: { expert: { key: string; name: string; photoUrl: string | null }; className?: string }) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    let live = true;
    loadVoices().then((v) => live && setVoices(v));
    return () => {
      live = false;
    };
  }, []);
  if (voices.length === 0) return null;
  return (
    <>
      <Button variant="secondary" size="sm" className={className} onClick={() => setOpen(true)}>
        <Phone />
        Appeler
      </Button>
      <CallDialog open={open} onOpenChange={setOpen} expert={expert} voices={voices} />
    </>
  );
}
