import type { BoComposioCall, BoComposioUsage, BoUsageFilter } from "@/lib/backoffice";
import { ApiError } from "@/lib/http";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

// The period and the member asked for, checked before they go into the back office's URL.
export function usageFilter(url: URL): BoUsageFilter {
  const filter: BoUsageFilter = {};
  for (const key of ["from", "to"] as const) {
    const value = url.searchParams.get(key);
    if (!value) continue;
    if (!DAY.test(value)) throw new ApiError(400, "invalid_request", "Cette période n’est pas valide.");
    filter[key] = value;
  }
  const member = url.searchParams.get("member")?.trim();
  if (member) {
    if (member.length > 254 || !member.includes("@")) throw new ApiError(400, "invalid_request", "Ce membre est introuvable.");
    filter.member = member;
  }
  return filter;
}

// The client sees volumes, never what a call costs Yelema: the amounts the back office sends stay here.
const count = ({ executions }: { executions: number }) => ({ executions });

export function volumesOnly(u: BoComposioUsage) {
  return {
    from: u.from,
    to: u.to,
    executions: u.executions,
    byDay: (u.byDay ?? []).map((d) => ({ day: d.day, ...count(d) })),
    byToolkit: u.byToolkit.map((t) => ({ toolkit: t.toolkit, ...count(t) })),
    byMember: u.byMember.map((m) => ({ email: m.email, name: m.name, ...count(m) })),
  };
}

export const callWithoutPrice = ({ occurredAt, email, name, toolkit, tool, via, httpStatus }: BoComposioCall) => ({ occurredAt, email, name, toolkit, tool, via, httpStatus });
