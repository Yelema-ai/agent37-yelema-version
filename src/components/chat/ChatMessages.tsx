"use client";

import { useSafeDashboard } from "@/components/experts/DashboardProvider";

import { useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, ClipboardCheck, Copy, CornerDownLeft, FileText, Image as ImageIcon, Loader2, PhoneCall, Repeat } from "lucide-react";
import { turnDocs } from "@/lib/drive-links";
import { kanbanNotice } from "@/lib/kanban-notice";
import { isRoutineRun, isSilentRun, routineRunText, SILENT_RUN_LABEL } from "@/lib/routines";
import { isCallTranscript } from "@/lib/voice";
import { isResumeSeed } from "@/lib/conversation-resume";
import { cn } from "@/lib/utils";
import { copyLater } from "@/lib/clipboard";
import { toast } from "sonner";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { UpdateSpinner, useDeployPhase } from "@/components/app/DeployStatus";
import type { Expert } from "@/lib/types";
import { useChatContext } from "./ChatProvider";
import { DocumentCards, useDriveListing } from "./DocumentCards";
import { Markdown } from "./Markdown";
import { cleanReply } from "@/lib/chat-errors";
import { mediaTags } from "@/lib/media-tags";
import { LiveWait, StepsList } from "./ChatSteps";
import type { ChatMessage, MessageAttachment } from "./types";

const PAGE = 80;

// Files that rode along with a user turn, shown as compact chips above the message bubble.
export function MessageAttachments({ attachments }: { attachments: MessageAttachment[] }) {
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

// The expert's reasoning, folded by default (it often comes in English, from the model itself):
// the label says it is thinking, the text opens on demand.
function ThinkingBlock({ content, live }: { content: string; live: boolean }) {
  const [open, setOpen] = useState(false);
  if (!content) return null;
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 py-1 text-xs text-ink-3 transition-colors hover:text-ink"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <span>{live ? "Réflexion en cours…" : "Réflexion"}</span>
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

// `face` is the expert whose replies these are: its portrait sits beside each one. Null on the
// instance's default home, which has no persona.
export function ChatMessages({
  messages,
  isStreaming,
  face = null,
  driveFolder = null,
  onShowEarlier,
  onUnqueue,
}: {
  messages: ChatMessage[];
  isStreaming: boolean;
  face?: Pick<Expert, "displayName" | "photoUrl" | "gateway"> | null;
  /** The expert's folder in the drive: the files written there during a turn get a card. */
  driveFolder?: string | null;
  /** Called before earlier messages are added above, so the view keeps its place. */
  onShowEarlier?: () => void;
  /** Takes back a message still waiting for the reply in progress: it has not been sent. */
  onUnqueue?: (id: string) => void;
}) {
  // The instance whose drive the paths in a reply point into (they become download links).
  const { agentId } = useChatContext();
  const updating = useDeployPhase() === "maintenance";
  // The reply being written: the last assistant bubble, even with queued messages below it.
  // A routine's run: its [SILENT] answer reads as "nothing to report".
  const routineThread = messages.some((m) => m.role === "user" && isRoutineRun(m.content));
  const liveIndex = isStreaming ? messages.findLastIndex((m) => m.role === "assistant") : -1;
  // The drive is listed once for all finished replies (from the oldest, to the minute), again after each turn:
  // it gives the cards their size and date, and tells a made-up path from a real one.
  const oldest = useMemo(
    () => messages.reduce<number | null>((min, m, i) => (m.role === "assistant" && i !== liveIndex && m.at != null && (min == null || m.at < min) ? m.at : min), null),
    [messages, liveIndex]
  );
  // A long conversation (the full history, compressions included) opens on its last messages.
  const [shown, setShown] = useState(PAGE);
  const start = Math.max(0, messages.length - shown);
  const since = oldest == null ? null : Math.floor((oldest - 60_000) / 60_000) * 60_000;
  const listing = useDriveListing(agentId, isStreaming ? null : driveFolder, since, String(messages.length));
      const dashboard = useSafeDashboard();

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("a");
    if (!target) return;
    const href = target.getAttribute("href") || "";
    const text = (target.textContent || "").toLowerCase();
    const isDashboardLink =
      (href.startsWith("https://mstudio-frames.onrender.com/share/frame/") ||
       href.startsWith("https://yelema-dashboards.onrender.com/share/frame/") ||
       href.startsWith("/modeles/")) &&
      (text.includes("ouvrir le tableau de bord") ||
       text.includes("tableau de bord") ||
       text.includes("ouvrir") ||
       href.includes("/modeles/"));

    if (isDashboardLink) {
      e.preventDefault();
      e.stopPropagation();
      dashboard?.openDashboard(href);
      void dashboard?.refresh();
    }
  };

  return (
    <div onClick={handleContainerClick} className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 sm:px-6">
      {start > 0 && (
        <div className="flex justify-center">
          <button type="button" onClick={() => {
              onShowEarlier?.();
              setShown((n) => n + PAGE);
            }} className="rounded-full border border-line px-3 py-1 text-xs text-ink-3 hover:bg-surface">
            Afficher les messages précédents ({start})
          </button>
        </div>
      )}
      {messages.slice(start).map((m, j) => {
        const i = start + j;
        if (m.role === "user" && isCallTranscript(m.content)) {
          return (
            <p key={m.id} className="flex items-center justify-center gap-2 text-xs text-ink-3">
              <PhoneCall className="h-3.5 w-3.5" /> Transcription de l’appel transmise à l’Expert
            </p>
          );
        }
        const notice = m.role === "user" ? kanbanNotice(m.content) : null;
        if (notice) {
          return (
            <p key={m.id} className="flex items-center justify-center gap-2 text-center text-xs text-ink-3">
              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" /> {notice.who} {notice.verb} la tâche confiée : « {notice.title} »
            </p>
          );
        }
        if (m.role === "system") {
          return (
            <p key={m.id} className="flex items-center gap-3 text-center text-xs text-ink-3 before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              {m.content}
            </p>
          );
        }
        if (m.role === "user" && isResumeSeed(m.content)) {
          return (
            <p key={m.id} className="flex items-center justify-center gap-2 text-center text-xs text-ink-3">
              <CornerDownLeft className="h-3.5 w-3.5 shrink-0" /> Conversation partagée reprise ici : l’Expert en a le contexte
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
              <div className="flex min-w-0 max-w-[85%] flex-col items-end gap-1.5">
                {attachments.length > 0 && <MessageAttachments attachments={attachments} />}
                {m.content && (
                  <div className={cn("max-w-full whitespace-pre-wrap rounded-[18px] rounded-br-md bg-brand [overflow-wrap:anywhere] px-4 py-2.5 text-[15px] text-on-brand", m.queued && "opacity-60", m.steered && !m.queued && "bg-brand/80")}>
                    {m.content}
                  </div>
                )}
                {m.queued && (
                  <span className="flex items-center gap-2 text-xs text-ink-3">
                    En attente
                    {onUnqueue && (
                      <button type="button" onClick={() => onUnqueue(m.id)} className="-my-2 inline-flex min-h-8 items-center rounded-lg px-1.5 font-semibold text-ink-2 hover:bg-soft hover:text-ink">
                        Retirer
                      </button>
                    )}
                  </span>
                )}
                {m.steered && !m.queued && (
                  <span className="flex items-center gap-1 text-xs text-ink-3">
                    <CornerDownLeft className="h-3 w-3" /> Ajouté pendant la réponse, pris en compte dans celle-ci
                  </span>
                )}
              </div>
            </div>
          );
        }

        const live = i === liveIndex;
        const tools = m.tools ?? [];
        // Once the expert works with tools, the turn shows one live step line; its reply appears when the turn ends.
        const working = live && tools.length > 0;
        const showDots = live && !working && !m.content && !m.thinking;

        return (
          <div key={m.id} className="flex items-start gap-3">
            {face && <ExpertAvatar expert={face} size="xs" className="mt-0.5" />}
            <div className="min-w-0 max-w-full flex-1 text-[15px] text-ink">
              {m.thinking && <ThinkingBlock content={m.thinking} live={live && !m.content} />}
              {(working || (showDots && !updating)) && <LiveWait tools={tools} name={face?.displayName ?? null} since={messages.slice(0, i).findLast((x) => x.role === "user")?.at} />}
              {!live && tools.length > 0 && <StepsList tools={tools} />}
              {routineThread && !live && isSilentRun(m.content) ? (
                <p className="text-sm italic text-ink-3">{SILENT_RUN_LABEL}</p>
              ) : m.content && !working ? (
                <Markdown content={cleanReply(m.content)} agentId={agentId} />
              ) : showDots && updating ? (
                // A reply held by the update: said to be received, so the wait does not read as a bug.
                <p role="status" className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3.5 py-2 text-sm font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
                  <UpdateSpinner />
                  {face ? `${face.displayName} reprend` : "Votre Expert reprend"} dans un instant, votre message est bien reçu.
                </p>
              ) : null}
              {!live && m.content && <DocumentCards agentId={agentId} docs={turnDocs(cleanReply(m.content), listing, [...(m.files ?? []), ...mediaTags(m.content).paths])} />}
              {!live && m.content && !(routineThread && isSilentRun(m.content)) && <CopyReply text={cleanReply(m.content)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Under each finished reply: copies its text, as « Copier » under a ChatGPT answer.
function CopyReply({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await copyLater(Promise.resolve(text));
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      toast.error("La réponse n’a pas pu être copiée. Réessayez.");
    }
  }
  return (
    <button
      type="button"
      onClick={() => void copy()}
      aria-label="Copier la réponse"
      title="Copier la réponse"
      className="-mb-2 -ml-3 mt-0.5 flex size-11 items-center justify-center rounded-lg text-ink-3 hover:bg-surface hover:text-ink"
    >
      {done ? <Check className="h-4 w-4 text-ok" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
