import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { backoffice, BackofficeError, type ComposioCallsDeclaration } from "@/lib/backoffice";
import { composioUserId, hashAppsToken, mintMcpSession, type McpSession } from "@/lib/composio";
import { pinnedAccounts } from "@/lib/connection-accounts";
import { extractComposioCalls } from "@/lib/composio-usage";
import { fetchUntilHeaders } from "@/lib/fetch-timeout";
import { memo } from "@/lib/memo";
import { backofficeUrl } from "@/lib/runtime-config";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { TenantError } from "@/lib/tenant-resolver";

// The MCP proxy between the experts and Yelema's Composio: the only place their tool traffic meets
// the key. Each instance's Hermes has an `apps` MCP server pointed here with its own Bearer token
// (the yelema-hermes image writes it into every profile from ~/.yelema/apps-mcp.json). The token
// maps to the instance, and the request is forwarded to a Composio tool session scoped to the
// MEMBER who owns it, so an expert only ever reaches its own member's connected accounts. Every
// client shares one database, so a token of another client's workspace is refused here too.
// Each tool execution that goes through is declared to the back office, which prices and stores it:
// by name only, and never in the expert's way (see declareCalls).
// Adapted from agent37-platform/hermes-openclaw-composio.
export const maxDuration = 300;

const FORWARD_REQUEST_HEADERS = ["content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"] as const;
const FORWARD_RESPONSE_HEADERS = ["content-type", "mcp-session-id", "mcp-protocol-version"] as const;

// One Composio session per member and set of default accounts, minted once per server instance and reused until
// Composio answers 404 (evicted) or 401 (key changed); then it is re-minted and the request replayed once.
const sessions = memo<McpSession>({ ttlMs: 12 * 60 * 60_000, maxEntries: 500, maxFlightMs: 30_000 });
const sessionKey = (userId: string, pins: Record<string, string[]>) => `${userId}|${JSON.stringify(pins)}`;

function getSession(userId: string, pins: Record<string, string[]>): Promise<McpSession> {
  // A pin Composio refuses (account gone since) must not cost the expert its tools: unpinned then.
  return sessions.get(sessionKey(userId, pins), () => mintMcpSession(userId, pins).catch((e) => (Object.keys(pins).length ? mintMcpSession(userId) : Promise.reject(e))));
}

// The member's default account per tool, chosen on the Intégrations screen and kept by the back office. Read
// at most once a minute per instance (and agent); the last answer stands while the back office is away.
const pinsCache = memo<Record<string, string[]>>({ ttlMs: 60_000, staleOnErrorMs: 6 * 60 * 60_000, maxEntries: 2000, maxFlightMs: 20_000 });

async function defaultPins(token: string, workspace: string, profile: string | null): Promise<Record<string, string[]>> {
  if (!backofficeUrl()) return {};
  try {
    return await pinsCache.get(`${hashAppsToken(token)}|${profile ?? ""}`, async () => pinnedAccounts((await backoffice.appsAccounts(token, workspace, profile ?? undefined)).defaults ?? {}));
  } catch (e) {
    // 404: a back office without the route yet. Anything else is kept quiet past the first line.
    if (!(e instanceof BackofficeError && e.status === 404)) console.warn("[composio-mcp] default accounts unavailable:", e instanceof Error ? e.message : e);
    return {};
  }
}

type TokenRow = { agent37_id: string; workspace_id: string; owner_user_id: string | null };
// The instance an apps token belongs to: kept a minute (an unknown token 10 s), a database outage never kept.
const tokenRows = memo<TokenRow | null>({ ttlMs: 60_000, ttlOf: (row) => (row ? 60_000 : 10_000), maxEntries: 2000, maxFlightMs: 15_000 });
class LookupDown extends Error {}

function rowOfToken(token: string): Promise<TokenRow | null> {
  const hash = hashAppsToken(token);
  return tokenRows.get(hash, async () => {
    const { data, error } = await createAdminClient()
      .from("agents")
      .select("agent37_id, workspace_id, owner_user_id")
      .eq("apps_token_hash", hash)
      .maybeSingle<TokenRow>();
    if (error) throw new LookupDown(error.message);
    return data ?? null;
  });
}

// Upstream answers its headers once the tool has run; the body may then stream.
const FORWARD_HEADERS_TIMEOUT_MS = 150_000;

function forward(session: McpSession, request: Request, body: ArrayBuffer | undefined): Promise<Response> {
  const headers: Record<string, string> = { ...session.headers };
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // redirect: "manual", or fetch would carry the Composio key across a cross-origin redirect.
  return fetchUntilHeaders(session.url, {
    method: request.method,
    headers,
    body: request.method === "POST" ? body : undefined,
    redirect: "manual",
    cache: "no-store",
  }, FORWARD_HEADERS_TIMEOUT_MS);
}

function errorJson(status: number, error: string): Response {
  return Response.json({ error }, { status });
}

const RETRY_DELAY_MS = 1_000;

// Tells the back office which tools this request executed. Started once Composio has answered and
// never awaited: the answer streams to the expert meanwhile, and nothing that happens here reaches
// it. A declaration that does not get through is lost; there is no queue.
function declareCalls(token: string, row: { agent37_id: string; workspace_id: string }, body: ArrayBuffer | undefined, httpStatus: number): void {
  if (!body || !backofficeUrl()) return;
  const occurredAt = new Date().toISOString();
  const sent = (async () => {
    // Let the answer leave first: a large body takes a moment to read.
    await new Promise((resolve) => setTimeout(resolve, 0));
    const calls = extractComposioCalls(new TextDecoder().decode(body));
    if (calls.length === 0) return;
    // Fixed once: a second try must carry the same id and the same calls to be counted once.
    const declaration: ComposioCallsDeclaration = { requestId: randomUUID(), occurredAt, httpStatus, calls };
    for (let attempt = 1; ; attempt++) {
      try {
        await backoffice.reportComposioCalls(token, row.workspace_id, declaration);
        return;
      } catch (e) {
        const status = e instanceof BackofficeError ? e.status : 0;
        // Only an outage is worth a second try; the back office's own refusals are final.
        if ((status === 0 || status >= 500) && attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
          continue;
        }
        const what = `[composio-mcp] ${row.agent37_id}: ${calls.length} tool call(s) not recorded (${status || "error"})`;
        // A refused body is ours to fix: the extraction let something out of the back office's bounds.
        if (status === 400) console.error(`${what}: declaration refused, check extractComposioCalls`);
        // 401 is expected while an instance is being rewired, 404 from a back office without the route.
        else console.warn(what);
        return;
      }
    }
  })().catch(() => {});
  try {
    // Keeps the function alive until the declaration is in, where the host would otherwise freeze it.
    after(() => sent);
  } catch {
    // Outside a request there is nothing to keep alive.
  }
}

// Chat d'entreprise: the enterprise instance has no agents row; its agent (`u-…`, header X-Yelema-Profile)
// reaches the apps of ITS member, whom the back office names from the instance token. Unknown agent: no row.
const SEAT_PROFILE = /^u-[a-z0-9]{6}$/;
const seats = memo<TokenRow | null>({ ttlMs: 60_000, ttlOf: (row) => (row ? 60_000 : 10_000), maxEntries: 2000, maxFlightMs: 20_000 });

async function seatRow(token: string, workspace: string | undefined, header: string | null): Promise<TokenRow | Response | null> {
  const profile = header?.trim() ?? "";
  if (!workspace || !SEAT_PROFILE.test(profile)) return null;
  try {
    return await seats.get(`${hashAppsToken(token)}|${workspace}|${profile}`, async () => {
      try {
        const { user } = await backoffice.seatAppsUser(token, workspace, profile);
        return { agent37_id: profile, workspace_id: workspace, owner_user_id: user };
      } catch (e) {
        if (e instanceof BackofficeError && e.status >= 400 && e.status < 500) return null;
        throw e;
      }
    });
  } catch {
    return errorJson(503, "token lookup unavailable");
  }
}

async function handle(request: Request): Promise<Response> {
  const token = /^Bearer\s+(.+)$/i.exec(request.headers.get("authorization") ?? "")?.[1]?.trim();
  if (!token) return errorJson(401, "missing bearer token");

  // The client this address belongs to: the deployment's, or the one of the host that was called.
  let pinned: string | undefined;
  try {
    pinned = await pinnedWorkspaceId();
  } catch (e) {
    // An outage must not look like a revoked token; a host that is no client's has no valid token.
    return e instanceof TenantError && e.status < 500 ? errorJson(401, "invalid token") : errorJson(503, "token lookup unavailable");
  }

  // An enterprise seat names itself: no agents row to look up.
  const seatHeader = request.headers.get("x-yelema-profile");
  const isSeat = SEAT_PROFILE.test(seatHeader?.trim() ?? "");
  let found: TokenRow | null = null;
  if (!isSeat) {
    try {
      found = await rowOfToken(token);
    } catch {
      // A database outage must not look like a revoked token to the expert.
      return errorJson(503, "token lookup unavailable");
    }
  }
  const row = found ?? (await seatRow(token, pinned, seatHeader));
  if (row instanceof Response) return row;
  if (!row) return errorJson(401, "invalid token");
  // An instance of another client than this address's is not ours to proxy.
  if (pinned && row.workspace_id !== pinned) return errorJson(401, "invalid token");
  const userId = composioUserId(row);
  const seat = found ? null : (request.headers.get("x-yelema-profile")?.trim() ?? null);
  const pins = await defaultPins(token, row.workspace_id, seat);

  const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
  try {
    let upstream = await forward(await getSession(userId, pins), request, body);
    if (upstream.status === 404 || upstream.status === 401) {
      sessions.drop(sessionKey(userId, pins));
      upstream = await forward(await getSession(userId, pins), request, body);
    }
    // Once per request, with the final status: a replay after a stale session is not a second call.
    declareCalls(token, row, body, upstream.status);
    if (upstream.status >= 300 && upstream.status < 400) return errorJson(502, "upstream redirect refused");

    const headers = new Headers();
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (e) {
    console.warn(`[composio-mcp] ${row.agent37_id} proxy failed:`, e instanceof Error ? e.message : e);
    return errorJson(502, "composio upstream unavailable");
  }
}

export { handle as POST, handle as DELETE };

// The optional standalone GET stream (server push) is refused: every MCP client opens it at connect
// and holds it, which would park one serverless function per expert for a channel nothing uses.
// It must stay a clean 405; a stream accepted then closed sends MCP clients into a reconnect loop.
export function GET(): Response {
  return new Response(null, { status: 405, headers: { allow: "POST, DELETE" } });
}
