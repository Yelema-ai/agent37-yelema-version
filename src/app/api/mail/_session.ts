import { requireBackofficeToken } from "@/lib/auth";

// The experts' e-mail is the back office's: these routes only relay, with the member's own session.
// Who may read or send is decided there on every call, never here.
export const mailToken = (): Promise<string> => requireBackofficeToken("Les e-mails des experts ne sont pas disponibles.");

export function noStore<T extends Response>(res: T): T {
  res.headers.set("Cache-Control", "no-store");
  return res;
}
