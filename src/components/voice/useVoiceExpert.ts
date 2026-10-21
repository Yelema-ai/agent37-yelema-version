"use client";

import { useCallback } from "react";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { useCatalogue } from "@/components/experts/useCatalogue";
import type { VoiceExpert } from "@/lib/voice";

/** An Expert as its default voice needs it: its key, « elle » or « il » from the catalogue (null when unknown), its rank. */
export function useVoiceExpert(): (key: string) => VoiceExpert {
  const { current } = useWorkspace();
  const { catalogue } = useCatalogue(current?.id);
  return useCallback(
    (key: string) => {
      const pronoun = catalogue.experts.find((e) => e.key === key)?.pronoun ?? null;
      // In the catalogue's order, Experts of the same gender take the voices in turn: no two neighbours alike.
      const rank = pronoun ? catalogue.experts.filter((e) => e.pronoun === pronoun).findIndex((e) => e.key === key) : -1;
      return { key, pronoun, ...(rank >= 0 ? { rank } : {}) };
    },
    [catalogue]
  );
}
