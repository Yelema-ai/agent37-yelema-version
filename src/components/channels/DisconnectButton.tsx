"use client";

import { useState } from "react";
import { Unplug } from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// The one way out of a channel, the same word everywhere (« Déconnecter »), in red and confirmed first:
// a click by mistake would silence the Experts on that messaging app.
export function DisconnectButton({
  name,
  onConfirm,
  disabled,
  className,
}: {
  name: string;
  onConfirm: () => unknown;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn("text-destructive hover:bg-destructive/10 hover:text-destructive", className)}
      >
        <Unplug />
        Déconnecter
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Déconnecter ${name} ?`}
        description={`Vos Experts ne recevront plus vos messages sur ${name}. Vous pourrez le reconnecter quand vous voulez.`}
        confirmText="Déconnecter"
        destructive
        onConfirm={async () => {
          await onConfirm();
        }}
      />
    </>
  );
}
