import { requireBackofficeToken } from "@/lib/auth";

// What `/api/account` and `/api/account/avatar` answer: the user's own profile, as the page edits it.
export const profile = (u: { firstName: string | null; lastName: string | null; jobTitle: string | null; email: string; avatarUrl?: string | null; voices?: Record<string, Partial<Record<"fr" | "en", string>>> }) => ({
  firstName: u.firstName ?? "",
  lastName: u.lastName ?? "",
  jobTitle: u.jobTitle ?? "",
  email: u.email,
  avatarUrl: u.avatarUrl ?? null,
  voices: u.voices ?? {},
});

/** The session's token: the profile is the back office's, and only there. */
export const token = (): Promise<string> => requireBackofficeToken("Ce réglage n’est pas disponible.");
