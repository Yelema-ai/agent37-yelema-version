"use client";

import { useAgentId } from "@/components/app/AppProvider";
import { ModelsView } from "@/components/models/ModelsView";

// Paramètres > Modèles: manage LLM providers and custom API keys (BYOK)
export default function ModelesPage() {
  const agentId = useAgentId();
  return <ModelsView agentId={agentId} />;
}
