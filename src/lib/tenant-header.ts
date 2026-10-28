import { createHmac, timingSafeEqual } from "node:crypto";

// The client the proxy resolved, handed to the route in a request header. The proxy deletes any
// value the browser sent and writes its own; routes outside the proxy (instance traffic) could
// still receive a forged one, so the value is sealed with a server secret and bound to the host.

export const TENANT_HEADER = "x-yelema-tenant";
const MAX_AGE_MS = 5 * 60_000;

export interface ResolvedTenant {
  workspaceId: string;
  name: string | null;
  logoUrl: string | null;
  status: "active" | "suspended";
}

const sign = (body: string, secret: string) => createHmac("sha256", `tenant-header:${secret}`).update(body).digest("base64url");

export function sealTenant(tenant: ResolvedTenant, host: string, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ t: tenant, h: host, at: now }), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/** The tenant the proxy wrote for this host; null for anything else (absent, forged, foreign host, too old). */
export function openTenant(raw: string | null | undefined, host: string | null, secret: string, now = Date.now()): ResolvedTenant | null {
  if (!raw || !host || !secret || raw.length > 4000) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const given = Buffer.from(raw.slice(dot + 1), "base64url");
  const expected = Buffer.from(sign(body, secret), "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const { t, h, at } = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { t?: ResolvedTenant; h?: string; at?: number };
    if (h !== host || typeof at !== "number" || now - at > MAX_AGE_MS || at - now > 60_000) return null;
    if (!t || typeof t.workspaceId !== "string" || !t.workspaceId) return null;
    return { workspaceId: t.workspaceId, name: t.name ?? null, logoUrl: t.logoUrl ?? null, status: t.status === "suspended" ? "suspended" : "active" };
  } catch {
    return null;
  }
}
