import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, vaultError } from "../../../_shared";

type Ctx = { params: Promise<{ profile: string; handle: string }> };

// `DELETE /api/vault/own/{profile}/{handle}` — retire une connexion d'un expert de sa propre instance.
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { profile, handle } = await params;
    return noStore(await backoffice.removeVaultItem(await settingsToken(), { kind: "own" }, profile, handle));
  } catch (e) {
    return vaultError(e);
  }
}
