"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Image as ImageIcon, Loader2, PhoneCall, Repeat } from "lucide-react";
import { isRoutineRun, isSilentRun, routineRunText, SILENT_RUN_LABEL } from "@/lib/routines";
import { isCallTranscript } from "@/lib/voice";
import { cn } from "@/lib/utils";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import type { Expert } from "@/lib/types";
import { useChatContext } from "./ChatProvider";
import { Markdown } from "./Markdown";
import { LiveStep, StepsList } from "./ChatSteps";
import type { ChatMessage, MessageAttachment } from "./types";

// Files that rode along with a user turn, shown as compact chips above the message bubble.
function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {attachments.map((a, k) => (
        <span
          key={`${a.path}-${k}`}
          title={a.name}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink"
        >
          {a.isImage ? (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-ink-3" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
          )}
          <span className="max-w-[12rem] truncate">{a.name}</span>
        </span>
      ))}
    </div>
  );
}

function ThinkingBlock({ content, live }: { content: string; live: boolean }) {
  const [open, setOpen] = useState(live);
  if (!content) return null;
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-ink-3 transition-colors hover:text-ink"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{live ? "Réflexion en cours…" : "Sa réflexion"}</span>
        {live && <Loader2 className="h-3 w-3 animate-spin" />}
      </button>
      {open && (
        <div className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap break-words border-l-2 border-line pl-3 text-xs leading-relaxed text-ink-3">
          {content}
        </div>
      )}
    </div>
  );
}

// A routine's run opens with its instructions, sent by the scheduler, not by the member.
function RoutineBrief({ content }: { content: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-semibold text-ink-2"
      >
        <Repeat className="h-4 w-4 text-ink-3" /> Consigne de la routine
        <ChevronDown className={cn("ml-auto h-4 w-4 text-ink-3 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="whitespace-pre-wrap break-words border-t border-line px-3 py-2 text-[13px] text-ink-2">{routineRunText(content)}</div>}
    </div>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-2 text-ink-3">
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="h-1.5 w-1.5 animate-pulse rounded-full bg-current"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

// `face` is the expert whose replies these are: its portrait sits beside each one. Null on the
// instance's default home, which has no persona.
export function ChatMessages({
  messages,
  isStreaming,
  face = null,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  face?: Pick<Expert, "displayName" | "photoUrl" | "gateway"> | null;
}) {
  // The instance whose drive the paths in a reply point into (they become download links).
  const { agentId } = useChatContext();
  // The reply being written: the last assistant bubble, even with queued messages below it.
  // A routine's run: its [SILENT] answer reads as "nothing to report".
  const routineThread = messages.some((m) => m.role === "user" && isRoutineRun(m.content));
  const liveIndex = isStreaming ? messages.findLastIndex((m) => m.role === "assistant") : -1;
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      {messages.map((m, i) => {
        if (m.role === "user" && isCallTranscript(m.content)) {
          return (
            <p key={m.id} className="flex items-center justify-center gap-2 text-xs text-ink-3">
              <PhoneCall className="h-3.5 w-3.5" /> Transcription de l’appel transmise à l’expert
            </p>
          );
        }
        if (m.role === "user" && isRoutineRun(m.content)) {
          return <RoutineBrief key={m.id} content={m.content} />;
        }
        if (m.role === "user") {
          const attachments = m.attachments ?? [];
          return (
            <div key={m.id} className="flex justify-end">
              <div className="flex max-w-[85%] flex-col items-end gap-1.5">
                {attachments.length > 0 && <MessageAttachments attachments={attachments} />}
                {m.content && (
                  <div className={cn("whitespace-pre-wrap break-words rounded-[18px] rounded-br-md bg-brand px-4 py-2.5 text-[15px] text-on-brand", m.queued && "opacity-60")}>
                    {m.content}
                  </div>
                )}
                {m.queued && <span className="text-xs text-ink-3">En attente</span>}
              </div>
            </div>
          );
        }

        const live = i === liveIndex;
        const tools = m.tools ?? [];
        const showDots =
          live && !m.content && !m.thinking && !tools.some((t) => t.status === "running");

        return (
          <div key={m.id} className="flex items-start gap-3">
            {face && <ExpertAvatar expert={face} size="xs" className="mt-0.5" />}
            <div className="min-w-0 max-w-full flex-1 text-[15px] text-ink">
              {m.thinking && <ThinkingBlock content={m.thinking} live={live && !m.content} />}
              {live ? <LiveStep tools={tools} /> : tools.length > 0 && <StepsList tools={tools} />}
              {routineThread && !live && isSilentRun(m.content) ? (
                <p className="text-sm italic text-ink-3">{SILENT_RUN_LABEL}</p>
              ) : m.content ? (
                <Markdown content={m.content} agentId={agentId} />
              ) : showDots ? (
                <TypingDots />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
