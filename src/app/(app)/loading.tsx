import { Loader2 } from "lucide-react";

// Shown at once on a navigation, while the next screen is read: the old one never stays frozen.
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="flex flex-1 items-center justify-center py-24">
      <Loader2 className="size-5 animate-spin text-ink-3" />
    </div>
  );
}
