import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, vaultDraft, vaultError } from "../../_shared";

type Ctx = { params: Promise<{ profile: string }> };

// `GET|POST /api/vault/own/{profile}` — les connexions confiées à un expert de sa propre instance.
// Lues sur l'instance à chaque appel ; le mot de passe part au back-office et ne revient jamais.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    return noStore(await backoffice.vault(await settingsToken(), { kind: "own" }, (await params).profile));
  } catch (e) {
    return vaultError(e);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    return noStore(await backoffice.addVaultItem(await settingsToken(), { kind: "own" }, (await params).profile, await vaultDraft(request)));
  } catch (e) {
    return vaultError(e);
  }
}
