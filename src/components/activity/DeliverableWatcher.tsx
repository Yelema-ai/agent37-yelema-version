"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { isDriveClutter } from "@/lib/drive-order";
import { fileLabel, isMemberUpload } from "@/lib/drive-paths";
import { driveTree, onDriveChanged } from "@/lib/drive-store";
import { agentTabPath } from "@/lib/expert-tabs";
import { readNotifyPrefs } from "@/lib/notify-prefs";
import { useOwnAgentId } from "@/components/conversations/useAllConversations";
import { usePoll } from "@/components/usePoll";
import { systemNotify } from "./system-notify";

// A file of the drive (three levels deep) the page has not seen yet is a new deliverable, announced
// like a reply (toast, system notification when the tab is hidden) unless switched off in Paramètres.
// The drive is read when something may have written there: a turn or a routine that ended, the tab
// shown again, and otherwise every 10 minutes while visible (a deliverable made from Telegram).
// The first reading is the baseline: nothing already there is announced.
const SAFETY_MS = 10 * 60_000;
// The expert writes its files as the turn ends: give it a moment.
const AFTER_EVENT_MS = 4_000;
// Back on the tab after this long away: one look.
const RETURN_MS = 2 * 60_000;

export function DeliverableWatcher() {
  const agentId = useOwnAgentId();
  const router = useRouter();
  const seen = useRef<Set<string> | null>(null);
  const hiddenAt = useRef<number | null>(null);

  const check = useCallback(
    async (maxAgeMs: number) => {
      if (!agentId) return;
      const tree = await driveTree(agentId, maxAgeMs).catch(() => null);
      // A folder that failed to list would read as files gone, then as new ones on the next pass.
      if (!tree || !tree.complete) return;
      // What the member brought is no deliverable of an Expert: never announced (Leslie, 30/10).
      const files = tree.entries.filter((e) => e.type === "file" && !e.hidden && !isDriveClutter(e) && !isMemberUpload(e.path));
      const before = seen.current;
      seen.current = new Set(files.map((f) => f.path));
      if (!before || !readNotifyPrefs().deliverable) return;
      const open = () => router.push(agentTabPath(agentId, "files"));
      for (const f of files.filter((f) => !before.has(f.path))) {
        toast("Nouveau livrable", { id: `livrable:${f.path}`, description: fileLabel(f), action: { label: "Ouvrir", onClick: open }, duration: 8000 });
        if (document.hidden) systemNotify("Nouveau livrable", fileLabel(f), `livrable:${f.path}`, open);
      }
    },
    [agentId, router]
  );

  useEffect(() => {
    seen.current = null;
  }, [agentId]);

  // Mount, the tab shown again, and the safety net; never while hidden.
  usePoll(() => check(60_000), { everyMs: SAFETY_MS, enabled: Boolean(agentId) });

  useEffect(() => {
    if (!agentId) return;
    let timer: number | undefined;
    // Heard while hidden: looked at once the tab shows again.
    let pending = false;
    const off = onDriveChanged(agentId, () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (document.hidden) pending = true;
        else void check(0);
      }, AFTER_EVENT_MS);
    });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAt.current = Date.now();
        return;
      }
      if (pending || (hiddenAt.current !== null && Date.now() - hiddenAt.current >= RETURN_MS)) void check(0);
      pending = false;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      off();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [agentId, check]);

  return null;
}
