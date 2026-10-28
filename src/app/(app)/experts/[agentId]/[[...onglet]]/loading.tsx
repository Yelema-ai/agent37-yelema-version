import { Loader2 } from "lucide-react";

// Moving to another expert paints its space at once; the conversation follows.
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="flex min-h-0 flex-1 flex-col">
      <div className="h-[92px] shrink-0 border-b border-line bg-surface" />
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-ink-3" />
      </div>
    </div>
  );
}
