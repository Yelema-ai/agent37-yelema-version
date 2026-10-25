// The accounts of each tool on the Connecteurs screen: every connection is listed, stale or duplicate
// ones included, so each can be removed on its own. Pure, so `node --test` runs it as is.
import type { IntegrationConnection } from "./types";

export type AccountState = "active" | "pending" | "failed" | "disabled";

export const ACCOUNT_STATE_LABELS: Record<AccountState, string> = {
  active: "Connecté",
  pending: "Connexion non terminée",
  failed: "En échec",
  disabled: "Désactivé",
};

export function accountState(c: IntegrationConnection): AccountState {
  const s = (c.status || "").toUpperCase();
  if (c.isDisabled || s === "INACTIVE" || s === "DISABLED") return "disabled";
  if (s === "ACTIVE") return "active";
  if (s === "INITIATED" || s === "INITIALIZING" || s === "PENDING") return "pending";
  return "failed";
}

const slugKey = (slug: string | null | undefined): string => (slug || "").toLowerCase();

/** Accounts by tool slug, active first, then the most recent. */
export function accountsBySlug(conns: readonly IntegrationConnection[]): Map<string, IntegrationConnection[]> {
  const out = new Map<string, IntegrationConnection[]>();
  for (const c of conns) {
    const k = slugKey(c.toolkitSlug);
    if (!k || !c.id) continue;
    out.set(k, [...(out.get(k) ?? []), c]);
  }
  for (const [k, list] of out) {
    out.set(
      k,
      [...list].sort(
        (a, b) =>
          Number(accountState(b) === "active") - Number(accountState(a) === "active") ||
          (b.updatedAt ?? b.createdAt ?? 0) - (a.updatedAt ?? a.createdAt ?? 0)
      )
    );
  }
  return out;
}

/** A short, stable label for an account: Composio gives no name, so the end of its id. */
export function accountLabel(c: IntegrationConnection, index: number): string {
  const tail = c.id.replace(/^ca_/, "").slice(-8);
  return `Compte ${index + 1} · ${tail}`;
}
