import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// A shared conversation's link carries this sealed token: unreadable, unforgeable without the server
// key. Only the conversation's owner can mint one; it names the thread and expires after LINK_DAYS.
// Who may open it is checked on each opening: a signed-in member of the same workspace. There is no
// list of links, so one cannot be withdrawn before it expires (that needs the back office).

export interface ConversationClaims {
  /** Workspace the conversation belongs to. */
  w: string;
  /** Instance (Agent37 id). */
  a: string;
  /** Hermes profile of the expert, "" for the instance's default home. */
  p: string;
  /** Session id on the instance. */
  s: string;
  /** Title shown on the shared page. */
  t: string;
  /** First name of the owner, shown on the shared page. */
  o: string;
  /** Expiry, in seconds since the epoch. */
  e: number;
}

export const LINK_DAYS = 30;
const MAX_TOKEN = 1024;

/** Key derived from DASHBOARD_SHARE_SECRET (own derivation); null ⇒ sharing is off (never a fallback secret). */
export function conversationKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const secret = env.DASHBOARD_SHARE_SECRET?.trim();
  if (!secret || secret.length < 16) return null;
  return Buffer.from(hkdfSync("sha256", secret, "yelema", "conversation-share-v1", 32));
}

export function sealConversation(claims: ConversationClaims, key: Buffer | null = conversationKey()): string | null {
  if (!key) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify({ v: 1, ...claims }), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

const text = (x: unknown, max: number, empty = false) => typeof x === "string" && x.length <= max && (empty || x.length > 0);

/** The claims of a valid, unexpired token; null for anything else. */
export function openConversation(token: unknown, now = Date.now(), key: Buffer | null = conversationKey()): ConversationClaims | null {
  if (!key || typeof token !== "string" || token.length > MAX_TOKEN || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const raw = Buffer.from(token, "base64url");
  if (raw.length < 29) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    const c = JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8")) as Record<string, unknown>;
    const ok =
      c.v === 1 && text(c.w, 128) && text(c.a, 128) && text(c.p, 128, true) && text(c.s, 128) && text(c.t, 200, true) && text(c.o, 80, true) &&
      typeof c.e === "number" && c.e * 1000 > now;
    return ok ? { w: c.w as string, a: c.a as string, p: c.p as string, s: c.s as string, t: c.t as string, o: c.o as string, e: c.e as number } : null;
  } catch {
    return null;
  }
}
