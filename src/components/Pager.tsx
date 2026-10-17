"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Page } from "@/lib/paginate";
import { Button } from "@/components/ui/button";

// Under a paginated list: "6–10 sur 12", previous / next, and the page size when `sizes` is given.
export function Pager({
  page,
  total,
  onPage,
  size,
  sizes,
  onSize,
}: {
  page: Page<unknown>;
  total: number;
  onPage: (page: number) => void;
  size?: number;
  sizes?: number[];
  onSize?: (size: number) => void;
}) {
  if (total <= (sizes?.[0] ?? size ?? 0) && page.pages === 1) return null;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
      {sizes && onSize && (
        <label className="flex items-center gap-1.5">
          Lignes
          <select
            value={size}
            onChange={(e) => onSize(Number(e.target.value))}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-[13px] text-ink"
          >
            {sizes.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <span className="ml-auto tabular-nums">
        {page.from}–{page.to} sur {total}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page précédente" disabled={page.page <= 1} onClick={() => onPage(page.page - 1)}>
        <ChevronLeft />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Page suivante" disabled={page.page >= page.pages} onClick={() => onPage(page.page + 1)}>
        <ChevronRight />
      </Button>
    </div>
  );
}
