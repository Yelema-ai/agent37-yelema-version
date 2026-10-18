"use client";

import { memo } from "react";
import { Streamdown } from "streamdown";
import "streamdown/styles.css";
import { ANGLED, BARE, CODE, LINKED, safeDecode } from "@/lib/drive-links";

// Experts give the drive path of what they saved (see lib/drive-paths.ts for the drive itself); turn those paths into download links (the
// browser can't open file:// links or instance paths, and Streamdown blocks them).
function linkDriveFiles(content: string, agentId: string): string {
  const url = (path: string) =>
    `/api/agents/${agentId}/files/content?path=${encodeURIComponent(safeDecode(path))}&disposition=attachment`;
  const name = (path: string) => safeDecode(path.split("/").pop() ?? path);
  return content
    .replace(ANGLED, (_m, path: string) => `](${url(path)})`)
    .replace(LINKED, (_m, path: string) => `](${url(path)})`)
    .replace(CODE, (_m, path: string) => `[${name(path)}](${url(path)})`)
    .replace(BARE, (_m, lead: string, path: string) => `${lead}[${name(path)}](${url(path)})`);
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
export const Markdown = memo(function Markdown({ content, agentId }: { content: string; agentId?: string }) {
  return (
    <Streamdown className="chat-markdown text-[15px] leading-relaxed" linkSafety={LINK_SAFETY} translations={FR}>
      {agentId ? linkDriveFiles(content, agentId) : content}
    </Streamdown>
  );
});
