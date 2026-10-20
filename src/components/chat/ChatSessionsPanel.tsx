"use client";

import { useState } from "react";
import { History, PanelLeft } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ChatSidebar } from "./ChatSidebar";
import { CONV, setRailOpen, useRailOpen } from "./rail-store";

// The « Conversations » button of the chat's header. On a computer it opens and closes the column of
// conversations beside the chat (closed, the chat keeps all its width). Phones and tablets have no room
// for it: the conversations open in a panel that slides from the left, over the chat, and picking or
// starting one closes it.
export function ChatSessionsPanel() {
  const [open, setOpen] = useState(false);
  const railOpen = useRailOpen();
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Conversations"
        title="Conversations"
        className="-ml-1.5 grid size-11 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-soft lg:hidden"
      >
        <History className="h-5 w-5" />
      </button>
      {CONV === "a" && (
      <button
        type="button"
        onClick={() => setRailOpen(!railOpen)}
        aria-pressed={railOpen}
        aria-label={railOpen ? "Masquer les conversations" : "Afficher les conversations"}
        title={railOpen ? "Masquer les conversations" : "Afficher les conversations"}
        className={cn("-ml-2 hidden size-10 shrink-0 place-items-center rounded-lg transition-colors lg:grid", railOpen ? "bg-tint text-brand-ink" : "text-ink-2 hover:bg-soft")}
      >
        <PanelLeft className="h-5 w-5" />
      </button>
      )}
      {CONV === "z" && (
      <button
        type="button"
        onClick={() => setRailOpen(!railOpen)}
        aria-pressed={railOpen}
        title={railOpen ? "Masquer les conversations" : "Afficher les conversations"}
        className={cn(
          "-ml-2 hidden h-10 shrink-0 items-center gap-2 rounded-full px-3 text-[13px] font-semibold transition-colors lg:inline-flex",
          railOpen ? "bg-tint text-brand-ink" : "text-ink-2 hover:bg-soft"
        )}
      >
        <History className="h-[18px] w-[18px]" />
        Conversations
      </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="left-0 top-0 flex h-dvh w-[86vw] max-w-[340px] translate-x-0 translate-y-0 flex-col gap-0 rounded-none rounded-r-[22px] border-y-0 border-l-0 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-12 data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden"
        >
          <DialogTitle className="sr-only">Conversations</DialogTitle>
          <ChatSidebar onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
