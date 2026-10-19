"use client";

import { useState } from "react";
import { isLocalLogo } from "@/lib/integration-catalog";
import { cn } from "@/lib/utils";

// A connector's logo in a box of fixed size, so nothing moves while it loads. The catalog's own
// logos are served by the app and load with the page; one from a search waits to be scrolled to.
// No logo, or one that fails: the name's initial.
export function ToolLogo({ logo, name, className, imgClassName }: { logo: string | null; name: string; className?: string; imgClassName?: string }) {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) {
    return (
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-soft", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo}
          alt=""
          width={24}
          height={24}
          loading={isLocalLogo(logo) ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={cn("h-6 w-6 object-contain", imgClassName)}
        />
      </span>
    );
  }
  return (
    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint font-display text-sm font-bold text-brand-ink", className)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
