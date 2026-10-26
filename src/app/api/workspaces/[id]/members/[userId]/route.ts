import { requireMember, requireUser } from "@/lib/auth";
import { backoffice, BackofficeError } from "@/lib/backoffice";
import { ApiError, handleError, json } from "@/lib/http";
import { authViaBackoffice } from "@/lib/runtime-config";
import { readSession } from "@/lib/session";

type Ctx = { params: Promise<{ id: string; userId: string }> };

// An admin removes a member of the enterprise chat; the back office refuses anyone else.
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const { id, userId } = await params;
    const { db, user } = await requireUser();
    const role = await requireMember(db, id, user.id);
    if (!authViaBackoffice() || role !== "admin") throw new ApiError(403, "forbidden", "Réservé aux administrateurs de l’espace.");
    if (!/^\d{1,12}$/.test(userId)) throw new ApiError(404, "not_found", "Membre introuvable.");
    const session = await readSession();
    if (!session) throw new ApiError(401, "unauthorized", "Session expirée.");
    try {
      return json(await backoffice.removeMember(session.accessToken, userId));
    } catch (e) {
      if (e instanceof BackofficeError) throw new ApiError(e.status, e.code, e.message);
      throw e;
    }
  } catch (e) {
    return handleError(e);
  }
}
