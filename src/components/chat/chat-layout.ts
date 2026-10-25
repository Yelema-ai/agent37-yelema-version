"use client";

import { useSyncExternalStore } from "react";

// How an expert's chat sits on a wide screen (Leslie, 25/10): its column of conversations shown or
// hidden (remembered in this browser), and the chat spread over the whole window, menu and header
// included, until « Réduire » or Échap. Shared by the workspace that lays the page out and the chat
// header that holds the buttons.

const LIST_KEY = "yelema.chat.list-hidden";

let listHidden = false;
let full = false;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    listHidden = localStorage.getItem(LIST_KEY) === "1";
  } catch {
    // Stockage indisponible : la colonne reste affichée.
  }
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => listeners.delete(l);
}

export function setChatListHidden(hidden: boolean) {
  listHidden = hidden;
  try {
    localStorage.setItem(LIST_KEY, hidden ? "1" : "0");
  } catch {
    // Le choix ne survivra pas au rechargement.
  }
  emit();
}

export function setChatFull(on: boolean) {
  full = on;
  emit();
}

export function useChatListHidden(): boolean {
  return useSyncExternalStore(subscribe, () => (load(), listHidden), () => false);
}

export function useChatFull(): boolean {
  return useSyncExternalStore(subscribe, () => full, () => false);
}
