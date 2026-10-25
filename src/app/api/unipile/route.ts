import { backoffice } from "@/lib/backoffice";
import { noStore, settingsToken, unipileDraft, unipileError } from "./_shared";

// `GET|PUT|DELETE /api/unipile` — la messagerie Unipile de sa propre instance ; la clé ne fait que passer.
export async function GET() {
  try {
    return noStore(await backoffice.unipile(await settingsToken()));
  } catch (e) {
    return unipileError(e);
  }
}

export async function PUT(request: Request) {
  try {
    return noStore(await backoffice.setUnipile(await settingsToken(), await unipileDraft(request)));
  } catch (e) {
    return unipileError(e);
  }
}

export async function DELETE() {
  try {
    return noStore(await backoffice.clearUnipile(await settingsToken()));
  } catch (e) {
    return unipileError(e);
  }
}
