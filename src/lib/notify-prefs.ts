// Which kinds of notice pop up (toast and system notification). The bell keeps every notice either way.
// Read from the browser's copy; `lib/prefs-sync` keeps it in step with the back office.

export type NoticeKind = "reply" | "routine" | "deliverable" | "failed";
export type NotifyPrefs = Record<NoticeKind, boolean>;

const KEY = "yelema.notify-prefs";
export const DEFAULT_NOTIFY_PREFS: NotifyPrefs = { reply: true, routine: true, deliverable: true, failed: true };

export function readNotifyPrefs(): NotifyPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<NotifyPrefs>;
    return { ...DEFAULT_NOTIFY_PREFS, ...raw };
  } catch {
    return DEFAULT_NOTIFY_PREFS;
  }
}

/** The local copy only (used by the sync). */
export function storeNotifyPrefs(prefs: NotifyPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Private window or blocked storage: the choice lasts for this page only.
  }
}

/** A choice made on this device: kept locally and sent to the back office. */
export async function saveNotifyPrefs(prefs: NotifyPrefs): Promise<void> {
  storeNotifyPrefs(prefs);
  (await import("@/lib/prefs-sync")).pushPrefs({ notify: prefs });
}
