import "server-only";
import { createSign } from "node:crypto";
import { ApiError } from "@/lib/http";

// Google Chat receives over Cloud Pub/Sub (no public address). Before writing, the service account key
// is proved by exchanging a signed assertion for a Chat token, and the subscription name is checked
// against its project. https://developers.google.com/identity/protocols/oauth2/service-account#httprest
const SUBSCRIPTION = /^projects\/([a-z][a-z0-9-]{4,28}[a-z0-9])\/subscriptions\/[A-Za-z][\w.~+%-]{2,254}$/;
const TOKEN_URL = "https://oauth2.googleapis.com/token";

interface ServiceAccount {
  type?: string;
  project_id?: string;
  client_email?: string;
  private_key?: string;
}

function parseServiceAccount(raw: string): Required<Pick<ServiceAccount, "client_email" | "private_key">> & ServiceAccount {
  let key: ServiceAccount;
  try {
    key = JSON.parse(raw) as ServiceAccount;
  } catch {
    throw new ApiError(400, "invalid_request", "La clé du compte de service doit être le fichier JSON téléchargé depuis Google Cloud, collé en entier.");
  }
  if (key.type !== "service_account" || !key.client_email || !key.private_key?.includes("PRIVATE KEY")) {
    throw new ApiError(400, "invalid_request", "Ce JSON n’est pas une clé de compte de service (IAM › Comptes de service › Clés › Ajouter une clé › JSON).");
  }
  return key as Required<Pick<ServiceAccount, "client_email" | "private_key">> & ServiceAccount;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** `projectId` and `subscription` are what is, or will be, on the agent; null when not set. */
export async function checkGoogleChatCredentials(raw: string, subscription: string | null, projectId: string | null): Promise<void> {
  const key = parseServiceAccount(raw);
  const project = SUBSCRIPTION.exec(subscription ?? "")?.[1];
  if (subscription !== null && !project) throw new ApiError(400, "invalid_request", "L’abonnement Pub/Sub s’écrit projects/<projet>/subscriptions/<nom>.");
  if (project && (projectId ?? key.project_id) && project !== (projectId ?? key.project_id)) {
    throw new ApiError(400, "invalid_request", "L’abonnement Pub/Sub n’appartient pas au projet de ce compte de service.");
  }
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: key.client_email, scope: "https://www.googleapis.com/auth/chat.bot", aud: TOKEN_URL, iat: now, exp: now + 300 };
  const unsigned = `${b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64url(JSON.stringify(claims))}`;
  let signature: string;
  try {
    signature = createSign("RSA-SHA256").update(unsigned).sign(key.private_key, "base64url");
  } catch {
    throw new ApiError(400, "invalid_request", "La clé privée de ce JSON est illisible : téléchargez une nouvelle clé.");
  }
  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError(502, "google_unreachable", "Google ne répond pas. Réessayez.");
  }
  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: string; error_description?: string };
  console.error("[channels] google token refused:", res.status, body.error, body.error_description);
  throw new ApiError(400, "invalid_credentials", "Google refuse cette clé : elle a peut-être été supprimée. Téléchargez une nouvelle clé JSON du compte de service.");
}
