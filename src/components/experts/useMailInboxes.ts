"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cached, cachedFetch, forget } from "@/lib/client-cache";
import type { MailInbox } from "@/lib/mail";
import { useWorkspace } from "@/components/WorkspaceProvider";

// The experts' inboxes this member may read. Starts from the last reading so the E-mails tab does
// not flicker in and out; an error reads as "no inbox", and the tab simply does not show.
export function useMailInboxes(): { inboxes: MailInbox[]; loaded: boolean; reload: () => Promise<void> } {
  const { userEmail, current } = useWorkspace();
  const key = `mail-inboxes:${userEmail}:${current?.id ?? ""}`;
  const [state, setState] = useState<{ key: string; inboxes: MailInbox[] } | null>(() => {
    const kept = cached<MailInbox[]>(key);
    return kept ? { key, inboxes: kept } : null;
  });

  // Read once for the shell, kept two minutes (an expert's space opened again asks nothing); `reload` asks anew.
  const read = useCallback(
    async (fresh: boolean) => {
      if (fresh) forget(key);
      try {
        const inboxes = await cachedFetch(key, () => apiFetch<{ items: MailInbox[] }>("/api/mail/inboxes").then((d) => d.items), 120_000);
        setState({ key, inboxes });
      } catch {
        setState((prev) => (prev?.key === key ? prev : { key, inboxes: [] }));
      }
    },
    [key]
  );
  const reload = useCallback(() => read(true), [read]);

  useEffect(() => {
    void read(false);
  }, [read]);

  const mine = state?.key === key ? state : null;
  return { inboxes: mine?.inboxes ?? [], loaded: mine !== null, reload };
}
