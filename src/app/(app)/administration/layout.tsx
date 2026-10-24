"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicConfig } from "@/components/PublicConfigProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/administration", label: "Membres", exact: true, adminOnly: true },
  { href: "/administration/instances", label: "Instances", exact: false, adminOnly: true },
  // The back office's: only where the app signs in through it.
  { href: "/administration/facturation", label: "Facturation", exact: false, adminOnly: true, backoffice: true },
  { href: "/administration/consommation", label: "Consommation", exact: false, adminOnly: true, backoffice: true },
  { href: "/administration/entreprise", label: "Entreprise", exact: false, adminOnly: false, backoffice: true },
  { href: "/administration/organigramme", label: "Organigramme", exact: false, adminOnly: true, backoffice: true },
];

// Le cadre de l'administration. Membres et Instances, pour les admins, sont deux listes à lire :
// tout s'y gère dans le back-office Yelema. Facturation et Consommation, pour les admins, lisent au
// back-office le forfait et les factures, et ce que les outils des experts ont coûté. Entreprise,
// pour chacun, montre ce que ses experts savent de l'entreprise (sa mémoire) ; l'admin y pose aussi
// le logo et la présentation. Organigramme, pour les admins, décide de qui lit quoi. Ce qui se
// branche sur les experts (connecteurs, canaux, e-mails, modèles, MCP) est dans Intégrations.
export default function AdministrationLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { current } = useWorkspace();
  const { authVia } = usePublicConfig();
  const tabs = TABS.filter(
    (t) => (!t.adminOnly || current?.role === "admin") && (!("backoffice" in t) || authVia === "backoffice")
  );

  // On a phone the row scrolls: the current tab is brought into view, never left off-screen.
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    nav.current?.querySelector<HTMLElement>("[aria-current=page]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <>
      <h1 className="mx-auto w-full max-w-[1280px] px-4 pt-6 font-display text-[30px] font-bold tracking-tight text-ink sm:px-8">Administration</h1>
      {tabs.length > 1 && (
        <nav
          ref={nav}
          aria-label="Administration"
          className="mx-auto flex w-full max-w-[1280px] shrink-0 gap-1 overflow-x-auto border-b border-line px-4 pt-2 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px shrink-0 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "border-brand text-ink" : "border-transparent text-ink-3 hover:text-ink"
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      )}
      {children}
    </>
  );
}
