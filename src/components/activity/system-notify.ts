"use client";

export type NotificationSupport = "unsupported" | "default" | "granted" | "denied";

export function notificationSupport(): NotificationSupport {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

// A system notification while the tab is hidden. Never throws: some browsers (Android Chrome)
// refuse the constructor outright, and a denied permission just means nothing shows.
export function systemNotify(title: string, body: string | undefined, tag: string, onOpen: () => void): void {
  if (notificationSupport() !== "granted") return;
  try {
    const n = new Notification(title, { body, tag });
    n.onclick = () => {
      window.focus();
      onOpen();
      n.close();
    };
  } catch {
    // The toast is still there when the user comes back.
  }
}

// Asked only from a click: browsers ignore (and some penalise) a prompt without a user gesture.
export async function askNotificationPermission(): Promise<NotificationSupport> {
  if (notificationSupport() !== "default") return notificationSupport();
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationSupport();
  }
}
