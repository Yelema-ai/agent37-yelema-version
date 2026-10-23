"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mic, Send } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { DictationBar } from "@/components/chat/ChatComposer";
import { useDictation } from "@/components/chat/useDictation";
import { useVoices } from "@/components/voice/useVoices";
import { CompanyProfileCard } from "@/components/company/CompanyProfileCard";
import { ExpertAvatar } from "@/components/experts/ExpertAvatar";
import { useExpertsContext } from "@/components/experts/ExpertsProvider";
import { useMyAgents } from "@/components/useMyAgents";
import { RecentDeliverables } from "@/components/home/RecentDeliverables";
import { agentTabPath } from "@/lib/expert-tabs";
import type { Expert } from "@/lib/types";
import { cn } from "@/lib/utils";

function today(): string {
  const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}


// Four openers that suit any company, whoever the message goes to. A click puts the start of the
// request in the field, to finish before sending.
const SHORTCUTS = ["Point du matin", "Préparer une réunion", "Résumer mes emails", "Suivre un dossier"] as const;
const isDjeneba = (e: Expert) => (e.catalogueKey ?? e.profileId).toLowerCase().includes("djeneba");

// The back office says the installation failed: said at once, with the experts concerned when it
// names them. Why it failed is Yelema's to see; nothing technical is shown.
function InstallFailed({ experts, partial }: { experts: string[]; partial: boolean }) {
  const names = new Intl.ListFormat("fr", { type: "conjunction" }).format(experts);
  return (
    <section role="alert" className={cn("max-w-2xl rounded-[22px] border border-ko/30 bg-ko-pale p-5 sm:p-6", partial ? "mt-3" : "mt-4")}>
      <h3 className="font-display text-lg font-bold text-ink">
        {partial ? "Une partie de votre équipe n’a pas pu être installée" : "Votre équipe n’a pas pu être installée"}
      </h3>
      <p className="mt-1 text-sm text-ink-2">
        {experts.length > 0 ? `L’installation de ${names} a échoué. ` : ""}
        Contactez Yelema pour que nous la relancions.
      </p>
    </section>
  );
}

// The installation has run for too long to still be waited for (useExperts gives up after a
// while): most likely it failed, which only Yelema can see and fix.
function InstallStalled() {
  return (
    <section role="status" className="mt-4 max-w-2xl rounded-[22px] border border-line bg-surface p-5 sm:p-6">
      <h3 className="font-display text-lg font-bold text-ink">L’installation prend plus de temps que prévu</h3>
      <p className="mt-1 text-sm text-ink-2">
        Vos experts ne sont pas encore prêts. Contactez Yelema pour que nous regardions ce qui bloque ; vous pouvez
        aussi recharger cette page plus tard.
      </p>
    </section>
  );
}

// What the home shows while the back office installs the first experts. The list is read again on
// its own (useExperts), so the team replaces this card without a reload.
function Installing() {
  return (
    <section role="status" className="mt-4 max-w-2xl rounded-[22px] border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-tint text-brand-ink">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-ink">Votre équipe s’installe</h3>
          <p className="mt-1 text-sm text-ink-2">
            Nous préparons vos experts. Cela prend quelques minutes : ils apparaîtront ici dès qu’ils seront prêts,
            sans que vous ayez à recharger la page.
          </p>
        </div>
      </div>
    </section>
  );
}

// Accueil: greeting, the chat bar (to the chat d'entreprise, or to Djénéba for who has her; sending
// opens that chat with the message on its way), four shortcuts, then the latest deliverables. The
// team itself is in the menu; here only where its installation stands.
export function HomeView() {
  const router = useRouter();
  const { current, userEmail, userFirstName } = useWorkspace();
  const { experts, loading, unreadable, installing, stalled, failed, failedExperts } = useExpertsContext();
  // The chat d'entreprise is the member's own instance with no Expert chosen; who has Djénéba may
  // write to her instead.
  const { agents } = useMyAgents(current?.id);
  const ownAgentId = agents[0]?.agent37_id ?? experts[0]?.agentId ?? null;
  const djeneba = experts.find(isDjeneba) ?? null;
  const [picked, setPicked] = useState<"entreprise" | "djeneba">("entreprise");
  const [text, setText] = useState("");
  const to = picked === "djeneba" && djeneba ? djeneba : null;
  const hello = userFirstName || userEmail.split("@")[0];

  // The microphone of the chat, here too: what is said lands in the field, sent with Envoyer.
  const canDictate = useVoices().length > 0;
  const dictation = useDictation({
    expert: to?.catalogueKey ?? null,
    onText: (said) => setText((prev) => (prev.trim() ? `${prev.trim()} ${said}` : said)),
    onError: (message) => toast.error(message),
  });

  function send(message: string) {
    const m = message.trim();
    if (!m) return;
    const path = to ? agentTabPath(to.agentId, "chat", to.profileId) : ownAgentId ? agentTabPath(ownAgentId, "chat") : null;
    if (path) router.push(`${path}?q=${encodeURIComponent(m)}`);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(text);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-8">
      <p className="text-[15px] text-ink-3">{today()}</p>
      <h1 className="mt-1 font-display text-[34px] font-bold tracking-tight text-ink sm:text-[38px]">Bonjour {hello}</h1>
      <CompanyProfileCard />

      {ownAgentId && (
        <>
          <section className="mt-5 rounded-[22px] border border-line bg-surface p-4 shadow-[0_8px_30px_rgb(48_22_103_/_0.05)]">
            {djeneba && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <span className="shrink-0 text-sm text-ink-3">À</span>
                <button
                  type="button"
                  onClick={() => setPicked("entreprise")}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-[13px] font-semibold transition-colors",
                    !to ? "border-brand/40 bg-tint text-brand-ink" : "border-line bg-surface text-ink-2 hover:bg-soft"
                  )}
                >
                  <Lock className="size-3.5" /> Chat d’entreprise
                </button>
                <button
                  type="button"
                  onClick={() => setPicked("djeneba")}
                  className={cn(
                    "flex h-9 shrink-0 items-center gap-2 rounded-full border pl-1 pr-3 text-[13px] font-semibold transition-colors",
                    to ? "border-brand/40 bg-tint text-brand-ink" : "border-line bg-surface text-ink-2 hover:bg-soft"
                  )}
                >
                  <ExpertAvatar expert={{ ...djeneba, gateway: null }} size="xs" />
                  {djeneba.displayName}
                </button>
              </div>
            )}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              rows={3}
              placeholder={to ? `Que voulez-vous confier à ${to.displayName} ?` : "Que puis-je faire pour vous ?"}
              className="mt-3 w-full resize-none bg-transparent px-1 text-[16px] text-ink placeholder:text-ink-3 focus:outline-none"
            />
            {dictation.state !== "idle" ? (
              <DictationBar dictation={dictation} />
            ) : (
            <div className="flex items-center justify-end gap-2">
              {canDictate && (
                <button
                  type="button"
                  onClick={() => void dictation.start()}
                  aria-label="Dicter un message"
                  title="Dicter un message"
                  className="inline-flex size-11 items-center justify-center rounded-xl text-ink-2 transition-colors hover:bg-soft hover:text-ink"
                >
                  <Mic className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => send(text)}
                disabled={!text.trim()}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-5 text-[15px] font-semibold text-on-brand hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-4 w-4" /> Envoyer
              </button>
            </div>
            )}
          </section>

          <div className="mt-3 flex flex-wrap gap-2">
            {SHORTCUTS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setText(`${label} : `)}
                className="rounded-full border border-dashed border-line bg-surface px-3.5 py-2 text-[13px] font-semibold text-ink-2 hover:border-brand/30 hover:text-ink"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      {installing && experts.length > 0 && (
        <p role="status" className="mt-2 flex items-center gap-2 text-sm text-ink-3">
          {stalled ? (
            "D’autres experts devaient arriver et tardent. Contactez Yelema s’ils n’apparaissent pas."
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> D’autres experts sont en cours d’installation.
            </>
          )}
        </p>
      )}
      {failed && <InstallFailed experts={failedExperts} partial={experts.length > 0} />}
      {failed && experts.length === 0 ? null : installing && experts.length === 0 ? (
        stalled ? (
          <InstallStalled />
        ) : (
          <Installing />
        )
      ) : loading && experts.length === 0 ? (
        <p className="mt-4 text-sm text-ink-3">Chargement de votre équipe…</p>
      ) : experts.length === 0 ? (
        <p className="mt-4 max-w-xl text-sm text-ink-2">
          {unreadable > 0
            ? "Votre équipe n’est pas joignable pour le moment. Réessayez dans un instant."
            : "Votre équipe s’installe. Vos experts apparaîtront ici dès qu’ils seront prêts."}
        </p>
      ) : null}
      {ownAgentId && <RecentDeliverables agentId={ownAgentId} />}
    </div>
  );
}
