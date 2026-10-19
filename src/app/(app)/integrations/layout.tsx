"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePublicConfig } from "@/components/PublicConfigProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/integrations/connecteurs", label: "Connecteurs", exact: false, adminOnly: false },
  { href: "/integrations/canaux", label: "Canaux", exact: false, adminOnly: false },
  { href: "/integrations/emails", label: "E-mails", exact: false, adminOnly: true, backoffice: true },
  { href: "/integrations/modeles", label: "Modèles", exact: false, adminOnly: false, backoffice: true },
  { href: "/integrations/mcp", label: "MCP", exact: false, adminOnly: false },
  { href: "/integrations/identifiants", label: "Identifiants", exact: false, adminOnly: false, backoffice: true },
];

// Le cadre des intégrations : ce qui se branche sur les experts. Connecteurs et Canaux, pour chacun,
// règlent sa propre instance. E-mails, pour les admins, dit qui peut faire écrire chaque expert.
// Modèles dit sur quel compte de modèle tournent les experts : un admin le règle pour l'entreprise
// ou pour un membre, un membre pour lui-même si son admin l'a permis. MCP, aux mêmes portées, branche
// sur les experts les serveurs d'outils du client. Identifiants confie à un expert l'accès à un site.
export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
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
      {tabs.length > 1 && (
        <nav
          ref={nav}
          aria-label="Intégrations"
          className="mx-auto flex w-full max-w-[1280px] shrink-0 gap-1 overflow-x-auto border-b border-line px-4 pt-4 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
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
