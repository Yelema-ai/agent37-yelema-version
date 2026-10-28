"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { readModelGroups, type ModelGroup } from "@/lib/model-options";

/** The models offered for `scope` (or one `provider`), read again when `version` changes; null until read or when the back office cannot serve them. */
export function useModelGroups(scope: string | null, provider?: string, version = ""): ModelGroup[] | null {
  const [groups, setGroups] = useState<ModelGroup[] | null>(null);
  useEffect(() => {
    if (!scope) return;
    let live = true;
    const q = `scope=${encodeURIComponent(scope)}${provider ? `&provider=${encodeURIComponent(provider)}` : ""}`;
    apiFetch<unknown>(`/api/llm/models?${q}`)
      .then((out) => live && setGroups(readModelGroups(out)))
      .catch(() => live && setGroups(null));
    return () => {
      live = false;
    };
  }, [scope, provider, version]);
  return groups;
}
