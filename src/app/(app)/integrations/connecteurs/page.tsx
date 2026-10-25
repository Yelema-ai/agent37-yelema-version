"use client";

import { MyInstance } from "@/components/MyInstance";
import { PageBody } from "@/components/app/PageBody";
import { ConnectorsView } from "@/components/integrations/ConnectorsView";
import { UnipileCard } from "@/components/integrations/UnipileCard";
import { useWorkspace } from "@/components/WorkspaceProvider";

// Intégrations · Connecteurs : les outils que la personne connectée branche sur son instance,
// pour tous ses experts.
export default function Page() {
  // Unipile is the instance's, set for its Experts: never on the company chat.
  const chatOnly = useWorkspace().current?.access === "entreprise";
  return (
    <PageBody>
      <div className="max-w-5xl space-y-5">
        {!chatOnly && <UnipileCard />}
        <MyInstance>{(agent) => <ConnectorsView agentId={agent.agent37_id} />}</MyInstance>
      </div>
    </PageBody>
  );
}
