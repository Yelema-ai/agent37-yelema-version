import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { backoffice, BackofficeError, type ComposioCallsDeclaration } from "@/lib/backoffice";
import { composioUserId, hashAppsToken, mintMcpSession, unipileAccount, unipileProxy, type McpSession } from "@/lib/composio";
import { extractComposioCalls } from "@/lib/composio-usage";
import { backofficeUrl } from "@/lib/runtime-config";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { TenantError } from "@/lib/tenant-resolver";
import { isSend, isUnipileTool, maskDestination, rewriteRpcPayload, rpcOf, unipileRequest, unipileResult, withUnipileTools } from "@/lib/unipile-tools";

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

// One Composio session per member, minted once per server instance and reused until Composio
// answers 404 (evicted) or 401 (key changed); then it is re-minted and the request replayed once.
const sessions = new Map<string, McpSession>();
const minting = new Map<string, Promise<McpSession>>();

function getSession(userId: string): Promise<McpSession> {
  const cached = sessions.get(userId);
  if (cached) return Promise.resolve(cached);
  let inflight = minting.get(userId);
  if (!inflight) {
    inflight = mintMcpSession(userId)
      .then((session) => {
        sessions.set(userId, session);
        return session;
      })
      .finally(() => minting.delete(userId));
    minting.set(userId, inflight);
  }
  return inflight;
}

function forward(session: McpSession, request: Request, body: ArrayBuffer | undefined): Promise<Response> {
  const headers: Record<string, string> = { ...session.headers };
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  // redirect: "manual", or fetch would carry the Composio key across a cross-origin redirect.
  return fetch(session.url, {
    method: request.method,
    headers,
    body: request.method === "POST" ? body : undefined,
    redirect: "manual",
    cache: "no-store",
  });
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

// Whether the member has an active Unipile connection, kept a minute so a tools/list costs no lookup.
const unipileSeen = new Map<string, { at: number; active: boolean }>();
async function hasUnipile(userId: string): Promise<boolean> {
  const hit = unipileSeen.get(userId);
  if (hit && Date.now() - hit.at < 60_000) return hit.active;
  const active = (await unipileAccount(userId).catch(() => null)) !== null;
  unipileSeen.set(userId, { at: Date.now(), active });
  return active;
}

// A Unipile tool call is answered here, never forwarded: Composio signs the Unipile request with the
// member's connection (proxy execute). A send leaves one audit line, without its text.
async function unipileCall(agent: string, userId: string, rpc: NonNullable<ReturnType<typeof rpcOf>>): Promise<Response> {
  const name = rpc.params.name;
  let out: { text: string; isError: boolean };
  if (!isUnipileTool(name)) out = { text: "Outil inconnu.", isError: true };
  else {
    try {
      const req = unipileRequest(name, rpc.params.arguments);
      const account = await unipileAccount(userId);
      if (!account) out = { text: "Aucun compte Unipile connecté : il se connecte dans Intégrations.", isError: true };
      else {
        const up = await unipileProxy(account, req);
        out = unipileResult(name, up);
        if (isSend(name)) console.info(`[unipile] envoi ${String(up.status)} instance=${agent} vers=${maskDestination(req.destination ?? "")} le=${new Date().toISOString()}`);
      }
    } catch (e) {
      const why = e instanceof Error ? e.message : "erreur";
      console.warn(`[unipile] ${agent} ${name}: ${why.slice(0, 200)}`);
      out = { text: /invalide|vide|trop long/.test(why) ? `Argument refusé : ${why}.` : "Unipile ne répond pas pour le moment.", isError: true };
    }
  }
  return Response.json({ jsonrpc: "2.0", id: rpc.id, result: { content: [{ type: "text", text: out.text }], isError: out.isError } });
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

  const { data: row, error } = await createAdminClient()
    .from("agents")
    .select("agent37_id, workspace_id, owner_user_id")
    .eq("apps_token_hash", hashAppsToken(token))
    .maybeSingle<{ agent37_id: string; workspace_id: string; owner_user_id: string | null }>();
  // A database outage must not look like a revoked token to the expert.
  if (error) return errorJson(503, "token lookup unavailable");
  if (!row) return errorJson(401, "invalid token");
  // An instance of another client than this address's is not ours to proxy.
  if (pinned && row.workspace_id !== pinned) return errorJson(401, "invalid token");
  const userId = composioUserId(row);

  const body = request.method === "POST" ? await request.arrayBuffer() : undefined;
  const rpc = body ? rpcOf(new TextDecoder().decode(body)) : null;
  if (rpc?.method === "tools/call" && isUnipileTool(rpc.params.name)) return unipileCall(row.agent37_id, userId, rpc);
  try {
    let upstream = await forward(await getSession(userId), request, body);
    if (upstream.status === 404 || upstream.status === 401) {
      sessions.delete(userId);
      upstream = await forward(await getSession(userId), request, body);
    }
    // Once per request, with the final status: a replay after a stale session is not a second call.
    declareCalls(token, row, body, upstream.status);
    if (upstream.status >= 300 && upstream.status < 400) return errorJson(502, "upstream redirect refused");

    const headers = new Headers();
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    if (rpc?.method === "tools/list" && upstream.ok && (await hasUnipile(userId))) {
      const sse = (upstream.headers.get("content-type") ?? "").includes("text/event-stream");
      return new Response(rewriteRpcPayload(await upstream.text(), sse, withUnipileTools), { status: upstream.status, headers });
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
