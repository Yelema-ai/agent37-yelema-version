"use client";

import { useState } from "react";
import {
  ChevronRight,
  Download,
  Eye,
  File as FileIcon,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  Globe,
  Image as ImageIcon,
  MoreHorizontal,
  Presentation,
} from "lucide-react";
import type { Deliverable } from "@/lib/deliverables";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveUrl, contentUrl, formatBytes, isDir, type FileEntry } from "./types";

const ICONS: Record<string, typeof FileIcon> = {
  PDF: FileText,
  Document: FileText,
  Texte: FileText,
  Tableur: FileSpreadsheet,
  Présentation: Presentation,
  "Page web": Globe,
  Image: ImageIcon,
  Dossier: Folder,
};

export const longDateFr = (ms: number) =>
  ms ? new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "";

export interface FileActions {
  agentId: string;
  onPreview: (entry: FileEntry, title?: string) => void;
  onBrowse: (path: string) => void;
}

// One deliverable: its title, kind and date, the main file to open, and what was gathered for it folded away.
export function DeliverableRow({ d, ...act }: { d: Deliverable } & FileActions) {
  const Icon = ICONS[d.kind] ?? FileIcon;
  const main = d.main;
  const download = main ? contentUrl(act.agentId, main.path, "attachment") : archiveUrl(act.agentId, d.path);
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-[10px] bg-tint text-brand-ink">
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => (main ? act.onPreview(main, d.title) : act.onBrowse(d.path))}
            className="block max-w-full truncate text-left text-[14.5px] font-semibold text-ink hover:underline"
            title={d.title}
          >
            {d.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
            <Badge variant="secondary">{d.kind}</Badge>
            {d.date > 0 && <span>{longDateFr(d.date)}</span>}
            {main && d.isFolder && <span className="truncate">{main.name}</span>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {main && (
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => act.onPreview(main, d.title)}>
              <Eye /> Ouvrir
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="size-9" title="Télécharger">
            <a href={download} download={main ? main.name : `${d.path.split("/").pop()}.tar.gz`} aria-label={`Télécharger ${d.title}`}>
              <Download className="size-4" />
            </a>
          </Button>
          {d.isFolder && (
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-9" aria-label={`Plus d’actions pour ${d.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={archiveUrl(act.agentId, d.path)} download={`${d.path.split("/").pop()}.tar.gz`}>
                    <Download /> Télécharger tout le dossier
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => act.onBrowse(d.path)}>
                  <FolderOpen /> Voir le dossier
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {(d.others.length > 0 || d.sources.length > 0 || d.archives.length > 0) && (
        <div className="ml-12 mt-1.5 flex flex-col gap-1">
          <Folded label="Autres fichiers" entries={d.others} {...act} />
          <Folded label="Sources" entries={d.sources} {...act} />
          <Folded label="Versions précédentes" entries={d.archives} {...act} />
        </div>
      )}
    </li>
  );
}

/** « Sources (4) », closed until clicked. */
export function Folded({ label, entries, ...act }: { label: string; entries: FileEntry[] } & FileActions) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1 text-xs font-semibold text-ink-3 hover:text-ink"
      >
        <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
        {label} ({entries.length})
      </button>
      {open && (
        <ul className="mt-1 flex flex-col gap-0.5 border-l border-line pl-3">
          {entries.map((e) => (
            <FileLine key={e.path} entry={e} {...act} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FileLine({ entry, ...act }: { entry: FileEntry } & FileActions) {
  const dir = isDir(entry);
  return (
    <li className="flex items-center gap-2 text-[13px]">
      <button
        type="button"
        onClick={() => (dir ? act.onBrowse(entry.path) : act.onPreview(entry))}
        className="min-w-0 flex-1 truncate text-left text-ink-2 hover:text-ink hover:underline"
      >
        {entry.name}
      </button>
      <span className="shrink-0 text-xs text-ink-3">{dir ? "Dossier" : formatBytes(entry.size)}</span>
      <a
        href={dir ? archiveUrl(act.agentId, entry.path) : contentUrl(act.agentId, entry.path, "attachment")}
        download={dir ? `${entry.name}.tar.gz` : entry.name}
        aria-label={`Télécharger ${entry.name}`}
        className="shrink-0 text-ink-3 hover:text-ink"
      >
        <Download className="size-3.5" />
      </a>
    </li>
  );
}
