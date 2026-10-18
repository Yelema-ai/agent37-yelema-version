"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, FileText, Loader2, MapPin, MessageCircle, Play, Sparkles, UserPlus, type LucideIcon } from "lucide-react";
import { usePublicConfig } from "@/components/PublicConfigProvider";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { apiFetch } from "@/lib/api";
import { ExpertImage } from "@/components/experts/ExpertImage";
import { useCatalogue, useCatalogueExpert } from "@/components/experts/useCatalogue";
import { Button } from "@/components/ui/button";
import { agentTabPath } from "@/lib/expert-tabs";
import { cn } from "@/lib/utils";

// Where any expert answers: the web app, and the channels its member connects (Canaux), in
// Yelema's order. The same for every expert: nothing here is the catalogue's.
const CHANNELS = ["Telegram", "Web", "Slack", "Teams", "WhatsApp"];

function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-line bg-surface p-5 @xl:p-6", className)}>
      <h2 className="font-display text-lg font-semibold tracking-[-0.01em] text-ink">{title}</h2>
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

function Note({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-tint text-brand-ink">
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
}

// The read-only sheet ("Fiche de poste") of one expert, written by Yelema in the back office.
// Sized by its own width (container queries), so it fits whatever column the page gives it. A
// section whose content the back office has not filled is simply left out.
export function ExpertFiche({ expertKey }: { expertKey: string }) {
  const { current } = useWorkspace();
  // Asking for an expert goes to the back office: offered only where the app signs in through it.
  const canRequest = usePublicConfig().authVia === "backoffice";
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const expert = useCatalogueExpert(expertKey);

  async function request() {
    setRequesting(true);
    try {
      await apiFetch(`/api/catalogue/${encodeURIComponent(expertKey)}/request`, { method: "POST" });
      setRequested(true);
      toast.success("Votre demande est transmise à Yelema.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRequesting(false);
    }
  }
  const { catalogue } = useCatalogue(current?.id);

  if (expert === null) return <p className="text-sm text-ink-3">Chargement…</p>;
  if (expert === false) {
    return (
      <div className="max-w-xl">
        <h1 className="font-display text-2xl font-semibold text-ink">Fiche indisponible</h1>
        <p className="mt-2 text-sm text-ink-2">Cette fiche n’existe pas, ou le catalogue n’est pas joignable pour le moment.</p>
        <Button asChild variant="outline" className="mt-4 rounded-full">
          <Link href="/recruter">Voir tous les experts</Link>
        </Button>
      </div>
    );
  }

  const mine = catalogue.experts.find((e) => e.key === expert.key)?.installed[0] ?? null;
  const pitch = expert.salesDescription ?? expert.description;
  const skills = expert.skills.length > 0 ? expert.skills : expert.competencies.map((name) => ({ name, summary: null }));
  // The full-length portrait, as on the site; the head-and-shoulders one when there is none.
  const image = expert.portraitUrl ?? expert.avatarUrl;
  const does = expert.pronoun === "elle" ? "Ce qu’elle fait" : expert.pronoun === "il" ? "Ce qu’il fait" : `Ce que fait ${expert.name}`;

  return (
    <div className="@container flex w-full max-w-[1100px] flex-col gap-4">
      <header className="flex flex-col overflow-hidden rounded-card border border-line bg-surface @2xl:grid @2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col justify-center p-6 @xl:p-8">
          <p className="text-[12.5px] font-semibold uppercase tracking-[0.06em] text-brand-ink">Fiche de poste</p>
          <h1 className="mt-2 font-display text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink @xl:text-[38px]">{expert.name}</h1>
          {expert.role && <p className="mt-1 text-[17px] font-semibold text-brand-ink">{expert.role}</p>}
          {expert.tagline && <p className="mt-4 max-w-[560px] font-display text-xl leading-snug text-ink @xl:text-[22px]">{expert.tagline}</p>}
          {pitch && <p className="mt-3 max-w-[620px] text-[15px] leading-[1.6] text-ink-2">{pitch}</p>}
        </div>
        {image && (
          <div className="relative order-first aspect-[4/5] bg-[linear-gradient(160deg,#C5C4FF_0%,#8D68FA_100%)] @2xl:order-none @2xl:aspect-auto @2xl:min-h-[380px]">
            <ExpertImage src={image} sizes="(min-width: 48rem) 300px, 100vw" priority className="object-cover object-top" />
          </div>
        )}
      </header>

      {expert.useCase && (
        <div className="flex flex-col items-start gap-2 rounded-[18px] bg-tint px-5 py-4 @xl:flex-row @xl:gap-3.5">
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[12.5px] font-semibold text-on-brand">
            <Play className="h-3 w-3 fill-current" />
            En action
          </span>
          <p className="text-[15px] leading-[1.55] text-ink">{expert.useCase}</p>
        </div>
      )}

      {expert.video.url && (
        <video
          controls
          preload="none"
          poster={expert.video.posterUrl ?? undefined}
          src={expert.video.url}
          className="aspect-video w-full rounded-card border border-line bg-black"
        />
      )}

      {skills.length > 0 && (
        <Section title={does}>
          <ul className="grid gap-x-8 gap-y-3.5 @2xl:grid-cols-2">
            {skills.map((s) => (
              <li key={s.name} className="flex gap-3">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-tint text-brand-ink">
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <div className="min-w-0">
                  <b className="block text-[15px] font-semibold leading-snug text-ink">{s.name}</b>
                  {s.summary && <span className="mt-0.5 block text-[13.5px] leading-[1.5] text-ink-2">{s.summary}</span>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {expert.deliverables.length > 0 && (
        <Section title="Exemples de livrables">
          <ul className="grid gap-2.5 @xl:grid-cols-2 @3xl:grid-cols-3">
            {expert.deliverables.map((d) => (
              <li key={d.label} className="flex items-center gap-3 rounded-2xl bg-soft p-3">
                {d.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.thumbnailUrl} alt="" loading="lazy" className="size-11 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-surface text-brand-ink">
                    <FileText className="size-[18px]" />
                  </span>
                )}
                <span className="min-w-0 text-[14px] font-medium leading-snug text-ink">{d.label}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {(expert.valueAdd || expert.whyRelevant) && (
        <Section title="Ce que vous y gagnez">
          <div className="grid gap-5 @3xl:grid-cols-2">
            {expert.valueAdd && (
              <Note icon={Sparkles} title="Pour votre équipe">
                {expert.valueAdd}
              </Note>
            )}
            {expert.whyRelevant && (
              <Note icon={MapPin} title="Sa maîtrise du terrain">
                {expert.whyRelevant}
              </Note>
            )}
          </div>
        </Section>
      )}

      <Section title="Où lui parler">
        <ul className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <li key={c} className="rounded-full border border-line bg-soft px-3.5 py-1.5 text-[13.5px] font-medium text-ink-2">
              {c}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-col items-stretch gap-4 rounded-card border-2 border-brand bg-surface p-5 @xl:flex-row @xl:items-center @xl:p-6">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{mine ? `${expert.name} est dans votre équipe` : `${expert.name} n’est pas encore dans votre équipe`}</p>
          <p className="mt-0.5 text-[13.5px] text-ink-3">
            {mine
              ? "Posez-lui une question ou confiez-lui une tâche."
              : !canRequest
                ? "Contactez Yelema ou l’administrateur de votre espace pour l’ajouter."
                : requested
                  ? "Votre demande est transmise à Yelema, qui revient vers vous."
                  : "Yelema reçoit votre demande et revient vers vous. Rien n’est installé ni facturé sans votre accord."}
          </p>
        </div>
        {mine ? (
          <Button asChild size="lg" className="h-11 rounded-full px-6">
            <Link href={agentTabPath(mine.agentId, "chat", mine.profileId)}>
              <MessageCircle />
              Écrire à {expert.name}
            </Link>
          </Button>
        ) : (
          canRequest && (
            <Button size="lg" className="h-11 rounded-full px-6" onClick={request} disabled={requesting || requested}>
              {requesting ? <Loader2 className="animate-spin" /> : requested ? <Check /> : <UserPlus />}
              {requested ? "Demande envoyée" : `Demander ${expert.name}`}
            </Button>
          )
        )}
      </div>
    </div>
  );
}
