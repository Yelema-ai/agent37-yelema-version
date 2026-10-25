"use client";

import { MyInstance } from "@/components/MyInstance";
import { PageBody } from "@/components/app/PageBody";
import { ConnectorsView } from "@/components/integrations/ConnectorsView";
import { UnipileCard } from "@/components/integrations/UnipileCard";

// Intégrations · Connecteurs : les outils que la personne connectée branche sur son instance,
// pour tous ses experts.
export default function Page() {
  return (
    <PageBody>
      <div className="max-w-5xl space-y-5">
        <UnipileCard />
        <MyInstance>{(agent) => <ConnectorsView agentId={agent.agent37_id} />}</MyInstance>
      </div>
    </PageBody>
  );
}
