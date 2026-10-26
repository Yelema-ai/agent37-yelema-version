/** What adding a typed address to a dashboard's E-mails list does; only members can sign in, so only they are kept. */
export type PersonVerdict =
  | { ok: true; email: string }
  | { ok: false; reason: "invalid" | "duplicate" | "self" | "outsider"; email: string };

export function personToAdd(raw: string, ctx: { chosen: string[]; members: { email: string }[]; self?: string | null }): PersonVerdict {
  const email = raw.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: "invalid", email };
  if (ctx.chosen.includes(email)) return { ok: false, reason: "duplicate", email };
  if (email === ctx.self?.trim().toLowerCase()) return { ok: false, reason: "self", email };
  if (!ctx.members.some((m) => m.email.trim().toLowerCase() === email)) return { ok: false, reason: "outsider", email };
  return { ok: true, email };
}
