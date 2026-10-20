"use client";

import { useSyncExternalStore } from "react";

// Whether an expert's conversations column is open beside the chat on a computer. Closed until the
// member opens it, then remembered per browser.
const KEY = "yelema.conversations-open";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
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

// TEMPORAIRE (planche du 20/10) : ?conv=a|b|c, l'emplacement du bouton qui ouvre les conversations. Retiré avant la PR.
export const CONV = typeof window === "undefined" ? "a" : (new URLSearchParams(window.location.search).get("conv") ?? "a");
