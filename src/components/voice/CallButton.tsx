"use client";

import { useEffect, useState } from "react";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CallDialog } from "./CallDialog";
import { useVoices } from "./useVoices";
import { preloadFace } from "./face";

/** "Appeler" for one expert; absent where voice calls are off (no voice offered). */
export function CallButton({ expert, className }: { expert: { key: string; name: string; photoUrl: string | null }; className?: string }) {
  const voices = useVoices();
  const [open, setOpen] = useState(false);
  const shown = voices.length > 0;
  // The face is loaded as soon as the button shows, so the call opens on it.
  useEffect(() => {
    if (shown) preloadFace(expert.photoUrl);
  }, [shown, expert.photoUrl]);
  if (!shown) return null;
  return (
    <>
      <Button variant="secondary" size="sm" className={className} onClick={() => setOpen(true)} onPointerEnter={() => preloadFace(expert.photoUrl)} onFocus={() => preloadFace(expert.photoUrl)}>
        <Phone />
        Appeler
      </Button>
      <CallDialog open={open} onOpenChange={setOpen} expert={expert} voices={voices} />
    </>
  );
}
