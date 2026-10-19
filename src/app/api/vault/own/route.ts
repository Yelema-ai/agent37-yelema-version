import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, vaultError } from "../_shared";

// `GET /api/vault/own` — toutes les connexions confiées aux experts de sa propre instance, en une lecture.
export async function GET() {
  try {
    return noStore(await backoffice.vaultOverview(await settingsToken()));
  } catch (e) {
    return vaultError(e);
  }
}
