import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

// The way back, the same everywhere (Leslie, 25/10: from a call, an e-mail, a folder or a preview it
// was not clear how to go back): a pill that names where it leads.
export function BackButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 max-w-full shrink-0 items-center gap-1 rounded-full border border-line bg-surface pr-3.5 pl-2 text-[13px] font-semibold text-ink transition-colors hover:bg-soft",
        className
      )}
    >
      <ChevronLeft className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
