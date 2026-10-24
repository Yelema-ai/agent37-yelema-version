"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { PageBody } from "@/components/app/PageBody";
import { SettingsCard, SettingsRow } from "@/components/settings/SettingsRows";
import { Button } from "@/components/ui/button";
import { askNotificationPermission, notificationSupport, type NotificationSupport } from "@/components/activity/system-notify";

// Paramètres · Notifications : être prévenu sur cet appareil quand un Expert répond. Le navigateur
// garde seul ce choix ; une fois refusé, il ne se change que dans ses propres réglages.
export default function Page() {
  const [notif, setNotif] = useState<NotificationSupport>("unsupported");
  useEffect(() => setNotif(notificationSupport()), []);

  async function enable() {
    const next = await askNotificationPermission();
    setNotif(next);
    if (next === "granted") toast.success("Notifications activées sur cet appareil.");
  }

  return (
    <PageBody>
      <SettingsCard>
        <SettingsRow
          label="Sur cet appareil"
          hint={
            notif === "denied"
              ? "Refusées : autorisez-les dans les réglages du navigateur."
              : notif === "unsupported"
                ? "Ce navigateur ne sait pas afficher de notifications."
                : "Être prévenu quand un Expert répond, même dans un autre onglet."
          }
        >
          {notif === "granted" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-ok-pale px-2.5 py-1 text-xs font-semibold text-ok">
              <Check className="h-3.5 w-3.5" /> Activées
            </span>
          ) : notif === "default" ? (
            <Button size="sm" onClick={() => void enable()}>
              Activer
            </Button>
          ) : null}
        </SettingsRow>
      </SettingsCard>
    </PageBody>
  );
}
