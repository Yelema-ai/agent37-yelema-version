import { requireBackofficeToken } from "@/lib/auth";

// Billing is the back office's, and its admins' only. Answers the session token to call it with.
// The back office checks the role again on every call; this check saves a member the round-trip
// and keeps the routes closed when the app does not sign in through the back office at all.
export const billingToken = (): Promise<string> => requireBackofficeToken("La facturation n’est pas disponible.", { admin: "Cette page est réservée aux administrateurs." });
