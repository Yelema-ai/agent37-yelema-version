import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, vaultError } from "../../../../_shared";

type Ctx = { params: Promise<{ memberId: string; profile: string; handle: string }> };

// `DELETE /api/vault/members/{memberId}/{profile}/{handle}` — retrait sur l'instance d'un membre (administrateur).
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { memberId, profile, handle } = await params;
    return noStore(await backoffice.removeVaultItem(await settingsToken(), { kind: "member", id: memberId }, profile, handle));
  } catch (e) {
    return vaultError(e);
  }
}
