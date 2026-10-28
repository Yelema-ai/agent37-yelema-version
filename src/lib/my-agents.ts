import "server-only";
import { backofficeAgentRow } from "@/lib/auth";
import { currentInstance } from "@/lib/session";
import type { MergedAgent } from "@/lib/types";

/** The signed-in user's instance as the shell shows it, from what the back office already read. */
export async function backofficeAgents(ownerEmail: string | null): Promise<MergedAgent[]> {
  const [row, instance] = await Promise.all([backofficeAgentRow(), currentInstance()]);
  if (!row || !instance) return [];
  return [
    {
      ...row,
      owner_email: ownerEmail,
      live_status: instance.state === "unknown" ? null : instance.state,
      status_reason: null,
      past_due: false,
      ports: [],
      update_available: false,
      image: instance.image.template ? { template: instance.image.template, revision: instance.image.revision } : null,
    },
  ];
}
