"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Loader2, MoreHorizontal, Plus, Server, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { StateBadge } from "@/components/models/MemberSources";
import { ScopePicker } from "@/components/models/ScopePicker";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { apiFetch } from "@/lib/api";
import type { SettingScope } from "@/lib/llm";
import { mcpPending, type McpOverview, type McpServer, type McpServerDraft, type McpWritten } from "@/lib/mcp-servers";
import { McpServerDialog } from "./McpServerDialog";

// Une pose prend d'ordinaire moins d'une minute par instance ; au-delà, on cesse de relire seul.
const POLL_MS = 4_000;
const POLL_TRIES = 45;

const scopeUrl = (scope: SettingScope) => (scope.kind === "member" ? `/api/mcp/members/${encodeURIComponent(scope.id)}` : `/api/mcp/${scope.kind}`);

function ServerCard({ server, note, onRemove }: { server: McpServer; note?: string; onRemove?: () => void }) {
  return (
    <div className="flex min-h-[76px] items-center gap-3 rounded-[22px] border border-line bg-surface py-3 pl-4 pr-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint text-brand">
        <Server className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-[15px] font-semibold text-ink">{server.name}</p>
          {note && <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[11px] font-semibold text-ink-3">{note}</span>}
        </div>
        <p className="truncate font-mono text-[12px] text-ink-3" title={server.url}>
          {server.url}
        </p>
        <p className="text-[11px] text-ink-3">{server.hint ? `Jeton ${server.hint}` : "Sans jeton"}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <StateBadge state={server.state} />
        {onRemove && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Options pour ${server.name}`} className="grid h-8 w-8 place-items-center rounded-full text-ink-3 transition-colors hover:bg-soft hover:text-ink">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem variant="destructive" onSelect={onRemove}>
                <Trash2 /> Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// Administration · MCP : les serveurs d'outils que le client branche sur ses experts. L'écran
// affiche ce que le back-office sert (serveurs en place, état) et lui demande d'en ajouter ou d'en
// retirer ; il n'écrit rien sur une instance et ne garde aucun jeton.
export function McpView() {
  const [data, setData] = useState<McpOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<SettingScope>({ kind: "own" });
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<McpServer | null>(null);
  const [tries, setTries] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await apiFetch<McpOverview>("/api/mcp"));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Tant qu'une pose est en cours, l'état est relu : l'écran passe seul à « En service » ou à l'échec.
  useEffect(() => {
    if (!data || !mcpPending(data) || tries >= POLL_TRIES) return;
    const timer = setTimeout(() => {
      setTries((n) => n + 1);
      void load();
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [data, tries, load]);

  const admin = data?.members !== undefined;
  // Un administrateur règle l'entreprise ou un membre ; un membre, seulement lui-même.
  useEffect(() => {
    if (data) setScope((s) => (admin ? (s.kind === "own" ? { kind: "client" } : s) : { kind: "own" }));
  }, [data, admin]);

  const member = scope.kind === "member" ? data?.members?.find((m) => m.id === scope.id) : undefined;
  const servers = (scope.kind === "client" ? data?.client : scope.kind === "member" ? member?.servers : data?.own) ?? [];
  // Sur l'instance d'un membre, les serveurs de l'entreprise s'ajoutent aux siens ; à nom égal, le sien l'emporte.
  const inherited = scope.kind === "member" ? (data?.client ?? []).filter((c) => !servers.some((s) => s.name === c.name)) : [];
  const editable = admin || data?.membersMayAddMcp === true;
  const scopeLabel = scope.kind === "client" ? "tous les experts de l’entreprise" : scope.kind === "member" ? `les experts de ${member?.name ?? member?.email ?? "ce membre"}` : "vos experts";

  async function written(call: Promise<McpWritten>, done: string) {
    const out = await call;
    setTries(0);
    await load();
    toast.success(done, { description: out.state === "pending" ? "L’installation sur les instances est en cours." : undefined });
  }

  async function add(draft: McpServerDraft) {
    await written(apiFetch<McpWritten>(scopeUrl(scope), { method: "POST", body: JSON.stringify(draft) }), `Serveur ${draft.name} enregistré`);
    setAdding(false);
  }

  async function remove() {
    if (!removing) return;
    await written(apiFetch<McpWritten>(`${scopeUrl(scope)}/${encodeURIComponent(removing.id)}`, { method: "DELETE" }), `Serveur ${removing.name} supprimé`);
  }

  async function allowMembers(open: boolean) {
    try {
      await apiFetch("/api/mcp/settings", { method: "PUT", body: JSON.stringify({ membersMayAddMcp: open }) });
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (error && !data) return <p className="max-w-xl rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-[24px] font-bold tracking-tight text-ink">Serveurs MCP</h2>
          <p className="mt-1 max-w-xl text-sm text-ink-3">Connectez vos serveurs Model Context Protocol (MCP) pour étendre les capacités de vos experts.</p>
        </div>
        {editable && (
          <Button onClick={() => setAdding(true)} className="self-start sm:self-auto">
            <Plus /> Ajouter un serveur MCP
          </Button>
        )}
      </div>

      {admin && data?.members && (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <ScopePicker members={data.members} value={scope} onChange={setScope} />
          <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-ink-2">
            <input type="checkbox" role="switch" checked={data.membersMayAddMcp} onChange={(e) => void allowMembers(e.target.checked)} className="h-4 w-4 rounded border-line accent-[var(--color-brand)]" />
            Les membres peuvent ajouter leurs propres serveurs
          </label>
        </div>
      )}

      <div className="flex items-start gap-3.5 rounded-[22px] border border-line bg-surface p-4 text-sm text-ink-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-brand">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-ink">Vos outils, sous votre responsabilité</p>
          <p className="text-xs leading-relaxed text-ink-3">
            Les outils d’un serveur sont offerts à tous les experts concernés, routines et messages reçus par Telegram ou WhatsApp compris. Yelema ne les vérifie pas : ne branchez qu’un serveur en qui vous avez confiance.
          </p>
        </div>
      </div>

      {data && !editable && (
        <p className="rounded-xl bg-soft px-4 py-3 text-sm text-ink-2">L’ajout de serveurs est réservé aux administrateurs de votre espace. Demandez au vôtre de l’ouvrir aux membres, ou de brancher le serveur pour vous.</p>
      )}

      <div className="space-y-3">
        <p className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Serveurs connectés ({data ? servers.length + inherited.length : "…"})</p>
        {!data ? (
          <div className="flex min-h-[12rem] items-center justify-center rounded-[22px] border border-line bg-surface p-8">
            <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
          </div>
        ) : servers.length + inherited.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {servers.map((s) => (
              <ServerCard key={s.id} server={s} onRemove={editable ? () => setRemoving(s) : undefined} />
            ))}
            {inherited.map((s) => (
              <ServerCard key={s.id} server={s} note="De l’entreprise" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-[22px] border border-dashed border-line px-6 py-12 text-center">
            <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-soft text-ink-3">
              <Layers className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-ink">Aucun serveur MCP personnalisé</p>
            <p className="mt-1 max-w-sm text-xs text-ink-3">Ajoutez vos serveurs MCP pour connecter vos sources de données et vos outils à vos experts.</p>
            {editable && (
              <Button onClick={() => setAdding(true)} variant="outline" size="sm" className="mt-4">
                <Plus />
                Ajouter un serveur MCP
              </Button>
            )}
          </div>
        )}
        {servers.some((s) => s.state === "failed") && (
          <p role="alert" className="rounded-xl bg-ko-pale px-4 py-3 text-sm text-ko">
            L’installation d’un serveur n’a pas abouti sur une instance au moins. Supprimez-le puis ajoutez-le de nouveau ; si cela persiste, contactez Yelema.
          </p>
        )}
      </div>

      <McpServerDialog open={adding} onOpenChange={setAdding} scopeLabel={scopeLabel} onSave={add} />

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Supprimer le serveur MCP"
        description={`Supprimer le serveur « ${removing?.name ?? ""} » ? Les experts concernés ne pourront plus utiliser ses outils, et la conversation en cours sera interrompue.`}
        confirmText="Supprimer"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
