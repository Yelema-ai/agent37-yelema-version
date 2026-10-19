import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, vaultDraft, vaultError } from "../../../_shared";

type Ctx = { params: Promise<{ memberId: string; profile: string }> };

// `GET|POST /api/vault/members/{memberId}/{profile}` — la même chose sur l'instance d'un membre, par un
// administrateur. Le back-office répond 404 à tout autre appelant.
export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { memberId, profile } = await params;
    return noStore(await backoffice.vault(await settingsToken(), { kind: "member", id: memberId }, profile));
  } catch (e) {
    return vaultError(e);
  }
}

export async function POST(request: Request, { params }: Ctx) {
  try {
    const { memberId, profile } = await params;
    return noStore(await backoffice.addVaultItem(await settingsToken(), { kind: "member", id: memberId }, profile, await vaultDraft(request)));
  } catch (e) {
    return vaultError(e);
  }
}
