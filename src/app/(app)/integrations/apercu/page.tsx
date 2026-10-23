"use client";

import { MyInstance } from "@/components/MyInstance";
import { PageBody } from "@/components/app/PageBody";
import { IntegrationsOverview } from "@/components/integrations/IntegrationsOverview";

// Intégrations · Aperçu : ce qui est branché sur les experts de la personne connectée, et ce qui reste à régler.
export default function Page() {
  return (
    <PageBody>
      <div className="max-w-5xl">
        <MyInstance>{(agent) => <IntegrationsOverview agentId={agent.agent37_id} />}</MyInstance>
      </div>
    </PageBody>
  );
}
