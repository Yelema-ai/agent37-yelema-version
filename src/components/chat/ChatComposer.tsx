"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Loader2, Mic, Send, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachButton, AttachmentTray } from "./Attachments";
import { useAudioRecorder } from "./useAudioRecorder";
import type { ChatAttachments } from "./useChatAttachments";
import type { SendSettings } from "./useChat";

interface Props {
  agentId: string;
  isStreaming: boolean;
  // Attachment state is owned by ChatView (so the whole pane is a drop zone) and passed in.
  att: ChatAttachments;
  onSend: (text: string, settings: SendSettings) => void;
  onStop: () => void;
  placeholder: string;
  // Prominent welcome-state composer (vs the compact docked composer).
  large?: boolean;
  focusToken?: number;
}

export function ChatComposer({
  agentId,
  isStreaming,
  att,
  onSend,
  onStop,
  placeholder,
  large = false,
  focusToken = 0,
}: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const grow = (el: HTMLTextAreaElement) => {
    const minHeight = large ? 76 : 44;
    el.style.height = "auto";
    el.style.height = `${Math.max(minHeight, Math.min(el.scrollHeight, 180))}px`;
  };

  const {
    isRecording,
    isTranscribing,
    duration,
    audioLevel,
    recordError,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder({
    agentId,
    onTranscribed: (transcribedText) => {
      setText((prev) => {
        const next = prev.trim() ? `${prev.trim()} ${transcribedText}` : transcribedText;
        return next;
      });
      if (textareaRef.current) {
        requestAnimationFrame(() => {
          if (textareaRef.current) {
            grow(textareaRef.current);
            textareaRef.current.focus();
          }
        });
      }
    },
  });

  useEffect(() => {
    if (focusToken === 0) return;
    const frame = requestAnimationFrame(() => textareaRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusToken]);

  const canSend = (text.trim().length > 0 || att.hasFiles) && !att.blocksSend && !isStreaming;

  const submit = () => {
    if (!canSend) return;
    const attachments = att.takeAttachments();
    onSend(text.trim(), { files: attachments.map((a) => a.path), attachments });
    setText("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      className={cn(
        "mx-auto w-full rounded-[22px] border border-line bg-surface shadow-[0_8px_30px_rgb(48_22_103_/_0.06)] transition-[border-color,box-shadow] focus-within:border-brand/30",
        large ? "max-w-2xl" : "max-w-3xl",
        isRecording && "border-red-400/50 shadow-[0_8px_30px_rgb(239_68_68_/_0.08)]"
      )}
    >
      {isRecording ? (
        <div className="flex items-center gap-3 px-5 py-4 animate-in fade-in duration-200">
          <span className="relative flex h-3.5 w-3.5 items-center justify-center">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-ink">{formatDuration(duration)}</span>
            <span className="text-xs text-ink-3">Enregistrement vocal... Parlez maintenant</span>
          </div>

          <div className="ml-auto mr-2 flex h-5 items-center gap-1">
            {[40, 70, 100, 60, 85].map((h, i) => (
              <span
                key={i}
                className="w-1 rounded-full bg-red-500/80 transition-all duration-75"
                style={{
                  height: `${Math.max(4, Math.min(20, Math.round((audioLevel / 100) * h * 0.25)))}px`,
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink-2 transition-colors hover:bg-soft hover:text-ink"
              title="Annuler l'enregistrement"
            >
              <Trash2 className="h-3.5 w-3.5 text-ko" />
              Annuler
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand px-3.5 text-xs font-semibold text-on-brand transition-opacity hover:opacity-90"
              title="Terminer et transcrire"
            >
              <Check className="h-3.5 w-3.5" />
              Terminer
            </button>
          </div>
        </div>
      ) : isTranscribing ? (
        <div className="flex items-center gap-3 px-5 py-4 animate-in fade-in duration-200">
          <Loader2 className="h-4 w-4 animate-spin text-brand" />
          <span className="text-sm font-medium text-ink-2">Transcription en cours...</span>
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              grow(e.target);
            }}
            onKeyDown={onKeyDown}
            onPaste={att.handlePaste}
            rows={1}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none bg-transparent px-5 pb-2 pt-4 text-ink placeholder:text-ink-3 focus:outline-none",
              large
                ? "min-h-[76px] max-h-[180px] text-[15px] leading-6"
                : "min-h-[44px] max-h-[180px] text-[15px] leading-relaxed"
            )}
          />
          <AttachmentTray files={att.files} onRemove={att.removeFile} onRetry={att.retryFile} />
          {recordError && (
            <div className="px-5 pb-1 text-xs font-medium text-ko">{recordError}</div>
          )}
          <div className="flex items-center gap-2 px-3 pb-3">
            <AttachButton onFiles={att.addFiles} disabled={isStreaming} />
            <button
              type="button"
              onClick={startRecording}
              disabled={isStreaming}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-soft hover:text-ink disabled:opacity-40"
              title="Dicter un message vocal (Speech-to-Text)"
              aria-label="Dicter un message vocal"
            >
              <Mic className="h-4 w-4" />
            </button>
            <div className="ml-auto">
              {isStreaming ? (
                <button
                  type="button"
                  onClick={onStop}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-ink px-4 text-sm font-semibold text-white hover:opacity-90"
                >
                  <Square className="h-3 w-3" fill="currentColor" strokeWidth={0} /> Arrêter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSend}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {att.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Envoyer
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
