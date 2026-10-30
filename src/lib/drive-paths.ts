// The drive: ~/Livrables on the member's instance. Experts save their work in their own folder
// there (~/Livrables/<Expert>/), the member uploads documents at its root. No imports: safe in
// client components (the path guard lives in lib/drive.ts, server-side).
export const DRIVE_ROOT = "~/Livrables";
// The same folder as the files API reports it (absolute; the image's home is /home/node).
export const DRIVE_ABS = "/home/node/Livrables";
// Where chat attachments land, so they show up in the Files tab too.
export const ATTACHMENTS_DIR = `${DRIVE_ROOT}/Pièces jointes`;

export function isDriveRoot(path: string): boolean {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === DRIVE_ROOT || trimmed === DRIVE_ABS;
}

/** Chat d'entreprise : le dossier de son agent (`u-…`) en tête d'un chemin, montré « Mes livrables », jamais l'identifiant. */
export function seatFolderOf(parts: readonly string[]): string | undefined {
  return parts[0] && /^u-[a-z0-9]{6}$/.test(parts[0]) ? parts[0] : undefined;
}

/** The drive a few levels deep, as `/api/agents/{id}/files/tree` answers it (`depth` 0 = the root's own entries). */
export interface DriveTree {
  entries: (import("./types").FileEntry & { depth: number })[];
  /** False when a folder could not be listed: what it holds is missing, not gone. */
  complete: boolean;
}

// What the member brought, not what an Expert made: the chat's attachments (« Pièces jointes ») and
// what was imported into an Expert's folder (« Reçus »). Never a deliverable, never announced as one.
const MEMBER_FOLDER = /(^|\/)(pi[eè]ces jointes|re[cç]us)(\/|$)/i;

export function isMemberUpload(path: string): boolean {
  return MEMBER_FOLDER.test(path.normalize("NFC"));
}

// The upload route names an attachment `<8 random characters>-<original name>` (« 18om3i4g-facture.pdf »):
// on screen, only the original name (Leslie, 30/10). Elsewhere a name is shown as it is.
const UPLOAD_PREFIX = /^[a-z0-9]{8}-(?=.)/;

export function fileLabel(entry: { name: string; path: string }): string {
  return /(^|\/)pi[eè]ces jointes\//i.test(entry.path.normalize("NFC")) ? entry.name.replace(UPLOAD_PREFIX, "") : entry.name;
}
