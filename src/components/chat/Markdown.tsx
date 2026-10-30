"use client";

import { memo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { ANGLED, BARE, citedFolder, CODE, FOLDER_BARE, FOLDER_CODE, isHiddenInChat, LINKED, normDrivePath, noteFolder, safeDecode } from "@/lib/drive-links";
import { chatLayout } from "@/lib/chat-layout";
import { agentTabPath } from "@/lib/expert-tabs";

const HIDDEN_LINK = /\[([^\]\n]*)\]\(<?(?:file:\/\/|sandbox:)?((?:\/home\/node|~)\/Livrables\/[^)>\n]+)>?\)/g;

// Experts give the drive path of what they saved (see lib/drive-paths.ts for the drive itself); turn those paths into download links (the
// browser can't open file:// links or instance paths, and Streamdown blocks them). A working note or memory file keeps its name, unlinked.
// A folder the Expert cites opens in Livrables, at that folder (Leslie, 27/10: « tu peux pas les rendre
// par défaut cliquables, sinon ça sert à rien »).
function linkDriveFiles(content: string, agentId: string, profileId?: string | null): string {
  const url = (path: string) =>
    `/api/agents/${agentId}/files/content?path=${encodeURIComponent(normDrivePath(path))}&disposition=attachment`;
  // A link's text is markdown: an underscore or a star in a file name must not turn into emphasis.
  const md = (label: string) => label.replace(/([_*\[\]])/g, "\\$1");
  const name = (path: string) => md(safeDecode(path.split("/").pop() ?? path));
  const link = (label: string, path: string) => {
    const note = noteFolder(path);
    if (note) return `[${md(normDrivePath(path).replace(/^~\//, ""))}](${agentTabPath(agentId, "files", profileId)}?dossier=${encodeURIComponent(note)})`;
    return isHiddenInChat(path) ? label : `[${label}](${url(path)})`;
  };
  return content
    .replace(HIDDEN_LINK, (m, label: string, path: string) => (isHiddenInChat(path) ? label : m))
    .replace(ANGLED, (_m, path: string) => `](${url(path)})`)
    .replace(LINKED, (_m, path: string) => `](${url(path)})`)
    .replace(CODE, (_m, path: string) => link(name(path), path))
    .replace(BARE, (_m, lead: string, path: string) => `${lead}${link(name(path), path)}`)
    .replace(FOLDER_CODE, (m, path: string) => folderLink(path, agentId, profileId) ?? m)
    .replace(FOLDER_BARE, (m, lead: string, path: string) => {
      const l = folderLink(path, agentId, profileId);
      return l ? `${lead}${l}` : m;
    });
}

function folderLink(path: string, agentId: string, profileId?: string | null): string | null {
  const folder = citedFolder(path);
  if (!folder) return null;
  const label = folder.replace(/^~\//, "").replace(/([_*\[\]])/g, "\\$1");
  return `[${label}](${agentTabPath(agentId, "files", profileId)}?dossier=${encodeURIComponent(folder)})`;
}

// Our own links (drive downloads) open directly; external ones still ask first.
const LINK_SAFETY = { enabled: true, onLinkCheck: (url: string) => url.startsWith("/") };

const FR = {
  close: "Fermer",
  copied: "Copié",
  copyCode: "Copier le code",
  copyLink: "Copier le lien",
  copyTable: "Copier le tableau",
  copyTableAsCsv: "Copier en CSV",
  copyTableAsMarkdown: "Copier en Markdown",
  copyTableAsTsv: "Copier en TSV",
  downloadDiagram: "Télécharger le schéma",
  downloadFile: "Télécharger le fichier",
  downloadImage: "Télécharger l’image",
  downloadTable: "Télécharger le tableau",
  downloadTableAsCsv: "Télécharger en CSV",
  downloadTableAsMarkdown: "Télécharger en Markdown",
  exitFullscreen: "Quitter le plein écran",
  externalLinkWarning: "Ce lien ouvre un site extérieur à Yelema.",
  imageNotAvailable: "Image indisponible",
  openExternalLink: "Ouvrir le lien externe ?",
  openLink: "Ouvrir le lien",
  viewFullscreen: "Plein écran",
};

// Streaming-aware markdown: Streamdown tolerates incomplete markdown (unclosed fences, partial
// tables) so we can feed it the running output buffer on every delta without flicker.
export const Markdown = memo(function Markdown({ content, agentId, profileId }: { content: string; agentId?: string; profileId?: string | null }) {
  const router = useRouter();
  // Streamdown opens every link in a new tab; a cited folder opens in this one, in Livrables. Its link
  // reads as the folder itself (« Livrables/Fatima/… »), which is how it is told apart from a file.
  const openFolder = (e: MouseEvent<HTMLDivElement>) => {
    const el = (e.target as Element).closest?.("[data-streamdown=link]");
    const label = el?.textContent?.trim() ?? "";
    const folder = agentId && /^Livrables\//.test(label) ? (citedFolder(label) ?? noteFolder(label)) : null;
    if (!folder || !agentId) return;
    e.preventDefault();
    e.stopPropagation();
    router.push(`${agentTabPath(agentId, "files", profileId)}?dossier=${encodeURIComponent(folder)}`);
  };
  return (
    <div onClickCapture={openFolder}>
      <Streamdown className="chat-markdown text-[15px] leading-relaxed" linkSafety={LINK_SAFETY} translations={FR}>
        {chatLayout(agentId ? linkDriveFiles(content, agentId, profileId) : content)}
      </Streamdown>
    </div>
  );
});
