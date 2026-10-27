"use client";

import { useCallback, useEffect, useState } from "react";
import { NO_MARKS, setMark, type ChatMarks } from "@/lib/chat-marks";
import { MARKS_EVENT, pushPrefs, readLocalMarks, storeLocalMarks, syncPrefs } from "@/lib/prefs-sync";

// Pinned and archived conversations. Every list re-reads on the same event, so pinning in the rail
// moves the row elsewhere at once; the back office keeps them for the member's other devices.
export function useChatMarks() {
  const [marks, setMarks] = useState<ChatMarks>(NO_MARKS);
  useEffect(() => {
    const sync = () => setMarks(readLocalMarks());
    sync();
    void syncPrefs();
    window.addEventListener(MARKS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MARKS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const mark = useCallback((key: string, kind: "pinned" | "archived", on: boolean) => {
    const next = setMark(readLocalMarks(), key, kind, on);
    storeLocalMarks(next);
    setMarks(next);
    pushPrefs({ chatMarks: next });
  }, []);

  return { marks, mark };
}
