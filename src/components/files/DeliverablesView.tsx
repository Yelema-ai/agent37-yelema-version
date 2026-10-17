"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, FolderOpen, Inbox, Loader2, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { buildBoard, type Subject, type TreeNode } from "@/lib/deliverables";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DeliverableRow, Folded, longDateFr, type FileActions } from "./DeliverableRow";
import { FilePreview } from "./FilePreview";
import type { FileEntry } from "./types";

const FIRST = 5;

// Livrables, read: the expert's folder as subjects then dated deliverables. Its journal stays out,
// unclassified files sit behind one link, and what was gathered for a deliverable is folded inside it.
export function DeliverablesView({ agentId, folder, onBrowse }: { agentId: string; folder: string; onBrowse: (path: string) => void }) {
  const [tree, setTree] = useState<TreeNode | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ entry: FileEntry; title?: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ tree: TreeNode | null }>(`/api/agents/${agentId}/files/tree?path=${encodeURIComponent(folder)}`);
      setTree(res.tree);
    } catch (e) {
      setError((e as Error).message || "Les livrables n’ont pas pu être lus.");
    } finally {
      setLoading(false);
    }
  }, [agentId, folder]);

  useEffect(() => {
    void load();
  }, [load]);

  const board = useMemo(() => (tree ? buildBoard(tree) : null), [tree]);
  const act: FileActions = { agentId, onBrowse, onPreview: (entry, title) => setPreview({ entry, title }) };
  const empty = board && !board.subjects.length && !board.loose.length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl p-6 md:px-10 md:py-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-ink">Livrables</h1>
            <p className="mt-1 text-sm text-ink-3">Classés par sujet, du plus récent au plus ancien.</p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {board?.inbox && (
              <Button variant="outline" size="sm" onClick={() => onBrowse(board.inbox!.path)}>
                <Inbox /> À classer ({board.inbox.count})
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onBrowse(folder)}>
              <FolderOpen /> Tous les fichiers
            </Button>
            <Button variant="ghost" size="icon" className="size-9" onClick={() => void load()} aria-label="Actualiser" title="Actualiser">
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {error ? (
          <p className="mt-5 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : tree === undefined ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-sm text-ink-3">
            <Loader2 className="size-4 animate-spin" /> Chargement des livrables…
          </p>
        ) : !board || empty ? (
          <div className="mt-5 rounded-[22px] border border-dashed bg-card p-10 text-center text-sm text-ink-3">
            Aucun livrable pour l’instant. Ce que l’expert produit apparaîtra ici, rangé par sujet.
          </div>
        ) : (
          <>
            {board.subjects.map((s) => (
              <SubjectCard key={s.path} subject={s} {...act} />
            ))}
            {board.loose.length > 0 && (
              <section className="mt-5 rounded-[22px] border bg-card p-4 sm:p-5">
                <h2 className="text-base font-semibold text-ink">{board.subjects.length ? "Autres livrables" : "Livrables"}</h2>
                <ul className="mt-1 divide-y divide-line">
                  {board.loose.map((d) => (
                    <DeliverableRow key={d.path} d={d} {...act} />
                  ))}
                </ul>
              </section>
            )}
            {board.archives.length > 0 && (
              <div className="mt-4 px-1">
                <Folded label="Versions précédentes" entries={board.archives} {...act} />
              </div>
            )}
          </>
        )}
      </div>
      <FilePreview agentId={agentId} entry={preview?.entry ?? null} title={preview?.title} onClose={() => setPreview(null)} />
    </div>
  );
}

function SubjectCard({ subject: s, ...act }: { subject: Subject } & FileActions) {
  const [all, setAll] = useState(false);
  const shown = all ? s.deliverables : s.deliverables.slice(0, FIRST);
  const n = s.deliverables.length;
  return (
    <section className="mt-5 rounded-[22px] border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{s.title}</h2>
        <span className="text-xs text-ink-3">
          {n} livrable{n > 1 ? "s" : ""}
          {s.updated > 0 && ` · ${longDateFr(s.updated)}`}
        </span>
      </div>
      {s.readme && (
        <button type="button" onClick={() => act.onPreview(s.readme!, `${s.title} — présentation`)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-ink hover:underline">
          <FileText className="size-3.5" /> Présentation du sujet
        </button>
      )}
      {n === 0 ? (
        <p className="mt-2 text-sm text-ink-3">Pas encore de livrable dans ce sujet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {shown.map((d) => (
            <DeliverableRow key={d.path} d={d} {...act} />
          ))}
        </ul>
      )}
      {n > FIRST && (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-1 text-xs font-semibold text-brand-ink hover:underline">
          {all ? "Réduire" : `Voir les ${n - FIRST} autres`}
        </button>
      )}
      {s.archives.length > 0 && (
        <div className="mt-2">
          <Folded label="Versions précédentes" entries={s.archives} {...act} />
        </div>
      )}
    </section>
  );
}
