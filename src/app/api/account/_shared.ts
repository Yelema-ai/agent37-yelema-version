import { ApiError } from "@/lib/http";
import { authViaBackoffice } from "@/lib/runtime-config";
import { readSession } from "@/lib/session";

// What `/api/account` and `/api/account/avatar` answer: the user's own profile, as the page edits it.
export const profile = (u: { firstName: string | null; lastName: string | null; jobTitle: string | null; email: string; avatarUrl?: string | null }) => ({
  firstName: u.firstName ?? "",
  lastName: u.lastName ?? "",
  jobTitle: u.jobTitle ?? "",
  email: u.email,
  avatarUrl: u.avatarUrl ?? null,
});

/** The session's token: the profile is the back office's, and only there. */
export async function token(): Promise<string> {
  if (!authViaBackoffice()) throw new ApiError(404, "not_found", "Ce réglage n’est pas disponible.");
  const session = await readSession();
  if (!session) throw new ApiError(401, "unauthorized", "Connectez-vous pour continuer.");
  return session.accessToken;
}
