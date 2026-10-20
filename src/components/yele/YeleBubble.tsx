"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { Bug, Loader2, Plug, Receipt, Repeat, RefreshCw, Send, Sparkles, Users, X } from "lucide-react";
import { useChat } from "@/components/chat/useChat";
import { Markdown } from "@/components/chat/Markdown";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { useCallState } from "@/components/voice/CallProvider";
import type { Companion } from "@/lib/companion";
import { cn } from "@/lib/utils";

const SHORTCUTS = [
  { label: "Recruter un Expert", desc: "Trouver le bon profil", prompt: "Je voudrais recruter un nouvel Expert.", icon: Users },
  { label: "Connecter mes outils", desc: "Drive, Telegram, MCP…", prompt: "Je voudrais connecter les outils de mon entreprise à mes Experts.", icon: Plug },
  { label: "Ma consommation", desc: "Forfait et usage", prompt: "Je voudrais comprendre ma consommation et mon forfait.", icon: Receipt },
  { label: "Créer une routine", desc: "Une tâche récurrente", prompt: "Je voudrais qu'un Expert fasse une tâche régulièrement pour moi.", icon: Repeat },
  { label: "Signaler un problème", desc: "Aide et support", prompt: "J'ai besoin d'aide ou je rencontre un problème sur Yelema.", icon: Bug },
];

// The conversation is kept per instance for the tab's life: another space never reopens it.
const sessionKey = (c: Companion) => `yele-session:${c.agentId}`;

function readSession(c: Companion): string | null {
  try {
    return sessionStorage.getItem(sessionKey(c));
  } catch {
    return null;
  }
}

function keepSession(c: Companion, id: string | null): void {
  try {
    if (id) sessionStorage.setItem(sessionKey(c), id);
    else sessionStorage.removeItem(sessionKey(c));
  } catch {}
}

// Yélé is the brand's asterisk with a face (hermes-experts yele/avatars), not a portrait: the still
// picture by default, the smiling loop when asked for (WebP, which Safari plays too), never for a
// visitor who asked for less motion.
function Portrait({ animated = false }: { animated?: boolean }) {
  return (
    <picture className="grid size-10 shrink-0 place-items-center rounded-full bg-tint ring-2 ring-brand/30">
      {animated && <source srcSet="/yele/yele-anime.webp" media="(prefers-reduced-motion: no-preference)" type="image/webp" />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/yele/yele-fixe.webp" alt="" width={128} height={128} className="size-9 object-contain" />
    </picture>
  );
}

function Panel({ companion, raised, folded, onClose }: { companion: Companion; raised: boolean; folded: boolean; onClose: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(() => readSession(companion));
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const { messages, isStreaming, error, send } = useChat({
    agentId: companion.agentId,
    profile: companion.profileId,
    sessionId,
    onSessionCreated: (id) => {
      setSessionId(id);
      keepSession(companion, id);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, isStreaming]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    send(input);
    setInput("");
  }

  function restart() {
    setSessionId(null);
    keepSession(companion, null);
  }

  const shown = messages.filter((m) => m.role !== "system");

  return (
    <div role="dialog" aria-label="Yélé, accompagnement" className={cn("fixed right-4 z-50 flex h-[580px] w-[calc(100vw-32px)] max-w-[420px] flex-col overflow-hidden rounded-[26px] border border-line bg-surface shadow-[0_20px_50px_rgba(0,0,0,0.22)] sm:right-6", raised ? "bottom-52 max-h-[calc(100dvh-15rem)]" : cn("bottom-20 max-h-[80vh]", folded && "sm:bottom-48"))}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <Portrait animated />
          <div>
            <p className="text-sm font-bold text-ink">Yélé</p>
            <p className="text-[11px] text-ink-3">Votre agent d’accompagnement&nbsp;: prise en main, conseils et support</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {shown.length > 0 && (
            <button type="button" onClick={restart} title="Nouvelle discussion" aria-label="Nouvelle discussion" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink">
              <RefreshCw className="size-3.5" />
            </button>
          )}
          <button type="button" onClick={onClose} title="Réduire" aria-label="Réduire" className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {shown.length === 0 ? (
          <>
            <div className="flex items-start gap-2.5 rounded-2xl border border-brand/20 bg-tint/50 p-3.5">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" />
              <p className="text-xs leading-relaxed text-ink-2">
                Bonjour, je suis <span className="font-bold text-brand">Yélé</span>. Je vous aide à tirer le meilleur de vos Experts, à brancher vos outils et à régler un blocage.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SHORTCUTS.map(({ label, desc, prompt, icon: Icon }) => (
                <button key={label} type="button" onClick={() => send(prompt)} disabled={isStreaming} className="flex flex-col items-start gap-1 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand/30 hover:bg-soft disabled:opacity-50">
                  <Icon className="size-4 text-brand" />
                  <span className="line-clamp-1 text-[12px] font-semibold text-ink">{label}</span>
                  <span className="line-clamp-1 text-[10px] text-ink-3">{desc}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          shown.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed", m.role === "user" ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm border border-line bg-soft text-ink")}>
                {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown content={m.content} agentId={companion.agentId} />}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <p className="flex items-center gap-2 pl-1 text-[11px] text-ink-3">
            <Loader2 className="size-3.5 animate-spin text-brand" /> Yélé rédige sa réponse…
          </p>
        )}
        {error && <p role="alert" className="rounded-xl bg-ko-pale p-2.5 text-xs text-ko">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex items-center gap-1.5 border-t border-line p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Posez une question à Yélé…"
          aria-label="Votre question à Yélé"
          className="w-full rounded-xl border border-line bg-soft/70 px-3.5 py-2 text-xs text-ink outline-none placeholder:text-ink-3 focus:border-brand/40 focus:bg-surface focus:ring-2 focus:ring-brand/15"
        />
        <button type="submit" disabled={!input.trim() || isStreaming} aria-label="Envoyer" className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-on-brand hover:opacity-90 disabled:pointer-events-none disabled:opacity-40">
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}

// Yélé's bubble, on every screen of the app — only where her profile is installed on the user's
// instance: without it there is no bubble, never a fallback on another profile.
export function YeleBubble() {
  const { companion } = useExpertsContext();
  const [open, setOpen] = useState(false);
  // An expert's workspace keeps its chat composer at the bottom: the bubble sits clear above it (and
  // so above a folded call too), never on the composer's Envoyer button.
  const raised = usePathname()?.startsWith("/experts/") ?? false;
  // A folded call floats in the same corner on a computer (on a phone it is a strip at the top).
  const { folded } = useCallState();
  if (!companion) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Fermer Yélé" : "Ouvrir Yélé, accompagnement"}
        aria-expanded={open}
        className={cn("fixed right-6 z-50 flex items-center gap-2.5 rounded-full border border-line bg-surface p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.16)] transition-transform hover:scale-105", raised ? "bottom-36" : cn("bottom-6", folded && "sm:bottom-32"), open && "ring-2 ring-brand/50")}
      >
        <Portrait animated={open} />
        {!open && <span className="hidden pr-3 text-xs font-semibold text-ink sm:inline">Yélé</span>}
      </button>
      {open && <Panel key={companion.agentId} companion={companion} raised={raised} folded={folded} onClose={() => setOpen(false)} />}
    </>
  );
}
