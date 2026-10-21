"use client";

import { useSyncExternalStore } from "react";

// Whether an expert's conversations column is open beside the chat. Open by default on a computer
// (mouse, screen wide enough for the column beside the chat), closed on a phone, a tablet or a
// small laptop, where it floats over the chat; the member's choice is then remembered.
const KEY = "yelema.conversations-open";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    const kept = localStorage.getItem(KEY);
    return kept ? kept === "1" : matchMedia("(pointer: fine) and (min-width: 1280px)").matches;
  } catch {
    return false;
  }
}

export function setRailOpen(open: boolean): void {
  try {
    localStorage.setItem(KEY, open ? "1" : "0");
  } catch {}
  listeners.forEach((l) => l());
}

export function useRailOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    read,
    () => false
  );
}

