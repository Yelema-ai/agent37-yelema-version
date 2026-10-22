import "server-only";
import type { BoDashboardShareView } from "@/lib/backoffice";
import { sealShare } from "@/lib/dashboard-token";

/** The share page of a back-office share, sealed: it names neither the instance nor the expert. Null when sharing is off. */
export function shareUrlOf(workspaceId: string | undefined, view: BoDashboardShareView | null): string | null {
  if (!workspaceId || !view?.share) return null;
  const token = sealShare({ w: workspaceId, s: view.share.id, n: view.share.number });
  return token ? `/dashboards/view?s=${token}` : null;
}

/** What the owner's browser may see of a share: never its number. */
export function shareForBrowser(view: BoDashboardShareView | null) {
  return {
    share: view?.share ? { mode: view.share.mode, people: view.share.people, updatedAt: view.share.updatedAt } : null,
    candidates: view?.candidates ?? [],
  };
}
