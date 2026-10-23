"use client";

import { useEffect, useState } from "react";
import { FileText, FolderOpen } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { DRIVE_ROOT } from "@/lib/drive-paths";
import { FilePreview } from "@/components/files/FilePreview";
import { formatMtime, isDir, type FileEntry, type FileListResponse } from "@/components/files/types";

const SHOWN = 6;

// « Derniers livrables » on the home page: the latest files of the drive, read at its root and one
// level down (each Expert keeps its own folder there). A click opens the file's preview. While
// nothing is read, or when the drive is empty, the block says so in a line.
export function RecentDeliverables({ agentId }: { agentId: string }) {
  const [files, setFiles] = useState<FileEntry[] | null>(null);
  const [preview, setPreview] = useState<FileEntry | null>(null);

  useEffect(() => {
    let live = true;
    const list = (path: string) =>
      apiFetch<FileListResponse>(`/api/agents/${agentId}/files/list?path=${encodeURIComponent(path)}`).then(
        (r) => r.entries.filter((e) => !e.hidden),
        () => [] as FileEntry[]
      );
    void (async () => {
      const root = await list(DRIVE_ROOT);
      const nested = await Promise.all(root.filter(isDir).map((d) => list(d.path)));
      const all = [...root, ...nested.flat()].filter((e) => e.type === "file");
      all.sort((a, b) => b.modified - a.modified);
      if (live) setFiles(all.slice(0, SHOWN));
    })();
    return () => {
      live = false;
    };
  }, [agentId]);

  return (
    <section className="mt-10">
      <h2 className="font-display text-[22px] font-bold tracking-tight text-ink">Derniers livrables</h2>
      {files === null ? (
        <p className="mt-3 text-sm text-ink-3">Chargement…</p>
      ) : files.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-ink-3">
          <FolderOpen className="size-4" /> Les livrables de vos Experts apparaîtront ici.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {files.map((f) => (
            <button
              key={f.path}
              type="button"
              onClick={() => setPreview(f)}
              className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-surface p-3 text-left transition-colors hover:bg-soft"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-tint text-brand-ink">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink">{f.name}</span>
                <span className="block truncate text-xs text-ink-3">{formatMtime(f.modified)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <FilePreview agentId={agentId} entry={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
