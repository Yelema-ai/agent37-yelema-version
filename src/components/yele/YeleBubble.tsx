"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bug, ChevronLeft, History, KeyRound, Loader2, Plug, Receipt, Repeat, Send, Sparkles, SquarePen, Users, X, type LucideIcon } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { profileQuery } from "@/lib/profile-id";
import { useChat } from "@/components/chat/useChat";
import { Markdown } from "@/components/chat/Markdown";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { useCallState } from "@/components/voice/CallProvider";
import type { Companion } from "@/lib/companion";
import { cn } from "@/lib/utils";

type Shortcut = { label: string; desc: string; prompt: string; icon: LucideIcon };

const SHORTCUTS: Shortcut[] = [
  { label: "Recruter un Expert", desc: "Trouver le bon profil", prompt: "Je voudrais recruter un nouvel Expert.", icon: Users },
  { label: "Connecter mes outils", desc: "Drive, Telegram, MCP…", prompt: "Je voudrais connecter les outils de mon entreprise à mes Experts.", icon: Plug },
  { label: "Ma consommation", desc: "Forfait et usage", prompt: "Je voudrais comprendre ma consommation et mon forfait.", icon: Receipt },
  { label: "Créer une routine", desc: "Une tâche récurrente", prompt: "Je voudrais qu'un Expert fasse une tâche régulièrement pour moi.", icon: Repeat },
  { label: "Signaler un problème", desc: "Aide et support", prompt: "J'ai besoin d'aide ou je rencontre un problème sur Yelema.", icon: Bug },
];

// Shortcuts that fit the page the member is on come first.
function pageShortcuts(path: string): Shortcut[] {
  if (path.startsWith("/integrations/modeles"))
    return [{ label: "Brancher ma clé d’IA", desc: "OpenAI, Anthropic, Gemini…", prompt: "Comment je branche la clé d'IA de mon entreprise sur mes Experts ?", icon: KeyRound }];
  if (path.startsWith("/integrations"))
    return [{ label: "Brancher Gmail", desc: "Pour que vos Experts lisent vos e-mails", prompt: "Comment je branche Gmail à mes Experts ?", icon: Plug }];
  if (path.startsWith("/administration/facturation"))
    return [{ label: "Ma dernière facture", desc: "Ce qu’elle contient", prompt: "Explique-moi ma dernière facture.", icon: Receipt }];
  if (path.startsWith("/recruter"))
    return [{ label: "Quel Expert pour moi ?", desc: "Selon votre besoin", prompt: "Aide-moi à choisir l'Expert qu'il me faut.", icon: Users }];
  const expert = path.match(/^\/experts\/[^/]+\/[^/_]*__([^/]+)/)?.[1];
  if (expert) {
    const name = decodeURIComponent(expert).replace(/^./, (c) => c.toUpperCase());
    return [{ label: `Bien travailler avec ${name}`, desc: "Ce qu’il sait faire", prompt: `Que peut faire ${name} pour moi, et comment bien lui demander ?`, icon: Sparkles }];
  }
  return [];
}

// The pages a reply of Yélé names, to open them in one tap (« Ouvrir Intégrations »).
const PAGES: { word: RegExp; label: string; href: string }[] = [
  { word: /\bconnecteurs?\b/i, label: "Connecteurs", href: "/integrations/connecteurs" },
  { word: /\bcanaux\b/i, label: "Canaux", href: "/integrations/canaux" },
  { word: /\bmod[eè]les\b/i, label: "Modèles", href: "/integrations/modeles" },
  { word: /\bMCP\b/, label: "MCP", href: "/integrations/mcp" },
  { word: /\bint[eé]grations\b/i, label: "Intégrations", href: "/integrations" },
  { word: /\bfacturation\b/i, label: "Facturation", href: "/administration/facturation" },
  { word: /\brecruter\b/i, label: "Recruter", href: "/recruter" },
];
function pagesIn(text: string, here: string) {
  const found = PAGES.filter((p) => p.word.test(text) && here !== p.href);
  // A tab of Intégrations makes the Intégrations button useless.
  const tab = found.some((p) => p.href.startsWith("/integrations/"));
  return found.filter((p) => !(tab && p.href === "/integrations")).slice(0, 3);
}

// When each Yélé discussion was last active, as in the conversations rail.
function shortWhen(at: number): string {
  const ms = at < 1e12 ? at * 1000 : at;
  const d = new Date(ms);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (ms >= today.getTime()) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// The open discussion is kept per instance, across tabs and visits: another space never reopens it.
const sessionKey = (c: Companion) => `yele-session:${c.agentId}`;

function readSession(c: Companion): string | null {
  try {
    return localStorage.getItem(sessionKey(c));
  } catch {
    return null;
  }
}

function keepSession(c: Companion, id: string | null): void {
  try {
    if (id) localStorage.setItem(sessionKey(c), id);
    else localStorage.removeItem(sessionKey(c));
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
  // « Anciennes discussions »: Yélé's past discussions, read from the instance.
  const [past, setPast] = useState<{ session_id: string; title: string | null; last_active: number }[] | null>(null);
  const path = usePathname() ?? "";
  const shortcuts = [...pageShortcuts(path), ...SHORTCUTS];
  const scrollRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // The field follows its text up to about five lines, then scrolls.
  const grow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };
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
    if (fieldRef.current) fieldRef.current.style.height = "auto";
  }

  function restart() {
    setSessionId(null);
    keepSession(companion, null);
    setPast(null);
  }

  function openPast() {
    setPast([]);
    apiFetch<{ sessions: { session_id: string; title: string | null; last_active: number }[] }>(
      `/api/agents/${companion.agentId}/chat/sessions${profileQuery(companion.profileId)}`
    )
      .then((r) => setPast([...r.sessions].sort((a, b) => b.last_active - a.last_active)))
      .catch(() => setPast(null));
  }

  function reopen(id: string) {
    setSessionId(id);
    keepSession(companion, id);
    setPast(null);
  }

  // On a phone the panel covers the page: following a link closes it.
  const leave = () => {
    if (!window.matchMedia("(min-width: 640px)").matches) onClose();
  };

  const shown = messages.filter((m) => m.role !== "system");

  return (
    <div role="dialog" aria-label="Yélé, accompagnement" className={cn(
        // Full screen on a phone (like a messaging app), a floating card from the tablet up.
        "fixed inset-0 z-[60] flex h-dvh flex-col overflow-hidden bg-surface pt-[env(safe-area-inset-top)] sm:inset-auto sm:right-6 sm:z-50 sm:h-[580px] sm:w-[420px] sm:rounded-[26px] sm:border sm:border-line sm:pt-0 sm:shadow-[0_20px_50px_rgba(0,0,0,0.22)]",
        raised ? "sm:bottom-52 sm:max-h-[calc(100dvh-15rem)]" : cn("sm:bottom-20 sm:max-h-[80vh]", folded && "sm:bottom-48")
      )}>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <Portrait animated />
          <div>
            <p className="text-[15px] font-bold text-ink">Yélé</p>
            <p className="text-[12.5px] leading-snug text-ink-3">Prise en main, conseils et support</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => (past ? setPast(null) : openPast())} title="Anciennes discussions" aria-label="Anciennes discussions" aria-pressed={!!past} className={cn("grid size-10 place-items-center rounded-lg hover:bg-soft hover:text-ink", past ? "bg-soft text-ink" : "text-ink-3")}>
            <History className="size-4" />
          </button>
          {(shown.length > 0 || past) && (
            <button type="button" onClick={restart} title="Nouvelle discussion" aria-label="Nouvelle discussion" className="grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink">
              <SquarePen className="size-4" />
            </button>
          )}
          <button type="button" onClick={onClose} title="Réduire" aria-label="Réduire" className="grid size-10 place-items-center rounded-lg text-ink-3 hover:bg-soft hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
        {past ? (
          <>
            <button type="button" onClick={() => setPast(null)} className="flex min-h-10 items-center gap-1 text-[13px] font-semibold text-ink-2 hover:text-ink">
              <ChevronLeft className="size-4" /> Anciennes discussions
            </button>
            {past.length === 0 ? (
              <p className="flex items-center gap-2 text-[13px] text-ink-3">
                <Loader2 className="size-3.5 animate-spin" /> Chargement…
              </p>
            ) : (
              <nav className="flex flex-col gap-0.5">
                {past.map((p) => (
                  <button key={p.session_id} type="button" onClick={() => reopen(p.session_id)} className={cn("flex min-h-11 items-center gap-2 rounded-xl px-3 text-left text-[14px] hover:bg-soft", p.session_id === sessionId ? "bg-soft-2 font-semibold text-ink" : "text-ink-2")}>
                    <span className="min-w-0 flex-1 truncate">{p.title || "Discussion avec Yélé"}</span>
                    <span className="shrink-0 text-[12px] tabular-nums text-ink-3">{shortWhen(p.last_active)}</span>
                  </button>
                ))}
              </nav>
            )}
          </>
        ) : shown.length === 0 ? (
          <>
            <div className="flex items-start gap-2.5 rounded-2xl border border-brand/20 bg-tint/50 p-3.5">
              <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" />
              <p className="text-[14px] leading-relaxed text-ink-2">
                Bonjour, je suis <span className="font-bold text-brand">Yélé</span>. Je vous aide à tirer le meilleur de vos Experts, à brancher vos outils et à régler un blocage.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shortcuts.map(({ label, desc, prompt, icon: Icon }) => (
                <button key={label} type="button" onClick={() => send(prompt)} disabled={isStreaming} className="flex flex-col items-start gap-1 rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-brand/30 hover:bg-soft disabled:opacity-50">
                  <Icon className="size-4 text-brand" />
                  <span className="line-clamp-1 text-[13.5px] font-semibold text-ink">{label}</span>
                  <span className="line-clamp-2 text-[12px] leading-snug text-ink-3">{desc}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          shown.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed", m.role === "user" ? "rounded-br-sm bg-brand text-on-brand" : "rounded-bl-sm border border-line bg-soft text-ink")}>
                {m.role === "user" ? <p className="whitespace-pre-wrap">{m.content}</p> : <Markdown content={m.content} agentId={companion.agentId} />}
                {m.role === "assistant" && !(isStreaming && m === shown[shown.length - 1]) && pagesIn(m.content, path).length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {pagesIn(m.content, path).map((p) => (
                      <Link key={p.href} href={p.href} onClick={leave} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-brand/25 bg-surface px-3 text-[13px] font-semibold text-brand-ink hover:bg-tint">
                        Ouvrir {p.label} <ArrowUpRight className="size-3.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isStreaming && (
          <p className="flex items-center gap-2 pl-1 text-[12.5px] text-ink-3">
            <Loader2 className="size-3.5 animate-spin text-brand" /> Yélé rédige sa réponse…
          </p>
        )}
        {error && <p role="alert" className="rounded-xl bg-ko-pale p-2.5 text-[13px] text-ko">{error}</p>}
      </div>

      {/* The same writing area as an Expert's chat: a field that grows with the text (Entrée sends,
          Maj + Entrée goes to the line), 16 px on a phone so iOS does not zoom, a 44 px send button. */}
      <form onSubmit={submit} className="border-t border-line p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
        {/* Once a discussion has started the shortcuts stay one tap away, in a row that scrolls. */}
        {shown.length > 0 && !past && (
          <div className="-mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 [scrollbar-width:none]">
            {shortcuts.map(({ label, prompt, icon: Icon }) => (
              <button key={label} type="button" onClick={() => send(prompt)} disabled={isStreaming} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[13px] font-semibold text-ink-2 hover:border-brand/30 hover:bg-soft disabled:opacity-50">
                <Icon className="size-3.5 text-brand" /> {label}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2 rounded-[18px] border border-line bg-soft/70 p-1.5 pl-4 transition-colors focus-within:border-brand/40 focus-within:bg-surface focus-within:ring-2 focus-within:ring-brand/15">
          <textarea
            ref={fieldRef}
            value={input}
            rows={1}
            onChange={(e) => {
              setInput(e.target.value);
              grow(e.target);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Posez une question à Yélé…"
            aria-label="Votre question à Yélé"
            className="max-h-[132px] min-h-[44px] w-full resize-none bg-transparent py-2.5 text-base leading-6 text-ink outline-none placeholder:text-ink-3 sm:text-[15px]"
          />
          <button type="submit" disabled={!input.trim() || isStreaming} aria-label="Envoyer" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-on-brand hover:opacity-90 disabled:pointer-events-none disabled:opacity-40">
            <Send className="size-[18px]" />
          </button>
        </div>
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
