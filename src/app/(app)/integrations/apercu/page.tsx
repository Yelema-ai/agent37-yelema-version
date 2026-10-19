"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MyInstance } from "@/components/MyInstance";
import { PageBody } from "@/components/app/PageBody";
import { IntegrationsOverview } from "@/components/integrations/IntegrationsOverview";

// Intégrations · Aperçu : ce qui est branché sur les experts de la personne connectée, et ce qui leur manque.
// ?variante=a ou ?variante=b montre une des deux propositions à comparer ; sans paramètre, la version en service.
function Overview() {
  const v = useSearchParams().get("variante");
  const variant = v === "a" || v === "b" ? v : null;
  return <MyInstance>{(agent) => <IntegrationsOverview agentId={agent.agent37_id} variant={variant} />}</MyInstance>;
}

export default function Page() {
  return (
    <PageBody>
      <div className="max-w-5xl">
        <Suspense>
          <Overview />
        </Suspense>
      </div>
    </PageBody>
  );
}
