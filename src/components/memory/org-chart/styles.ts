// Shared classes of the org chart screen.
export const FIELD =
  "h-9 max-w-full rounded-[10px] border border-line bg-surface px-2 text-[13px] font-normal text-ink focus-visible:border-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/15";
export const CARD = "rounded-[22px] border border-line bg-surface";
export const LINK = "text-[12px] font-semibold text-link hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 rounded";
export const LINK_KO = "text-[12px] font-semibold text-ko hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ko/30 rounded";
export const HEADING = "mb-2 mt-5 text-[11px] font-bold uppercase tracking-wide text-ink-3";

/** "1 membre", "2 membres". */
export const count = (n: number, word: string): string => `${n} ${word}${n > 1 ? "s" : ""}`;
