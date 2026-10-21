"use client";

import { useSyncExternalStore } from "react";

// Whether an expert's conversations column is open beside the chat. Open by default on a computer
// (mouse, wide screen), closed on a phone or tablet browser; the member's choice is then remembered.
const KEY = "yelema.conversations-open";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    const kept = localStorage.getItem(KEY);
    return kept ? kept === "1" : matchMedia("(pointer: fine) and (min-width: 1024px)").matches;
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

