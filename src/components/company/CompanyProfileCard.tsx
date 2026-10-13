"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { usePublicConfig } from "@/components/PublicConfigProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import type { CompanyProfile } from "@/lib/company";

// The admin's reminder on the home page while the company profile is incomplete. Dismissed for the
// session only: it comes back at the next visit until the three steps are done.
const DISMISSED = "company-profile-card-dismissed";

export function CompanyProfileCard() {
  const { current } = useWorkspace();
  const { authVia } = usePublicConfig();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const wanted = authVia === "backoffice" && current?.role === "admin";

  useEffect(() => {
    if (!wanted || sessionStorage.getItem(DISMISSED)) return;
    let alive = true;
    // A silent read: a failure only means no reminder.
    fetch("/api/workspace/profile")
      .then((res) => (res.ok ? (res.json() as Promise<CompanyProfile>) : null))
      .then((p) => alive && setProfile(p))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [wanted]);

  if (!profile || profile.done >= profile.total) return null;
  return (
    <section className="mt-5 flex max-w-2xl items-start gap-3 rounded-[22px] border border-brand/25 bg-tint p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold text-ink">
          Complétez votre entreprise ({profile.done}/{profile.total})
        </h2>
        <p className="mt-1 text-sm text-ink-2">Ajoutez votre logo, une présentation et vos documents : vos experts répondront avec le contexte de votre entreprise.</p>
        <Link href="/administration/entreprise" className="mt-3 inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand hover:bg-brand/90">
          Compléter
        </Link>
      </div>
      <button
        type="button"
        aria-label="Masquer ce rappel"
        className="rounded-lg p-1.5 text-ink-3 hover:bg-soft hover:text-ink"
        onClick={() => {
          sessionStorage.setItem(DISMISSED, "1");
          setProfile(null);
        }}
      >
        <X className="h-4 w-4" />
      </button>
    </section>
  );
}
