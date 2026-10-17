"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeliverablesView } from "./DeliverablesView";
import { FilesView } from "./FilesView";

// The Livrables tab, kept MOUNTED-BUT-HIDDEN by the shell. An expert's folder opens as subjects and
// deliverables; « Tous les fichiers » is the plain browser (upload, rename, delete) at a chosen folder.
// The instance's default home has no folder of its own: the browser only.
export function FilesTab({ agentId, initialPath }: { agentId: string; initialPath?: string }) {
  const [browse, setBrowse] = useState<string | null>(null);
  if (!initialPath) return <FilesView agentId={agentId} />;
  if (browse === null) return <DeliverablesView agentId={agentId} folder={initialPath} onBrowse={setBrowse} />;
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b bg-background px-4 pt-3 md:px-6 lg:px-8">
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => setBrowse(null)}>
          <ArrowLeft /> Livrables par sujet
        </Button>
      </div>
      <div className="min-h-0 flex-1">
        <FilesView key={browse} agentId={agentId} initialPath={browse} />
      </div>
    </div>
  );
}
