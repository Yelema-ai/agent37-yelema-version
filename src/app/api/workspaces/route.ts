import { requireUser } from "@/lib/auth";
import { authViaBackoffice } from "@/lib/runtime-config";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { currentPrincipal, workspaceOfMe } from "@/lib/session";
import { handleError, json, ApiError, dbError } from "@/lib/http";
import type { Role, Workspace, WorkspaceWithRole } from "@/lib/types";

export async function GET() {
  try {
    const { db, user } = await requireUser();
    if (authViaBackoffice()) {
      const me = await currentPrincipal();
      return json({ workspaces: me ? [workspaceOfMe(me)] : [] });
    }
    // A deployment only ever lists its own client's workspace (shared database).
    let query = db.from("memberships").select("role, workspaces(*)").eq("user_id", user.id);
    const pinned = await pinnedWorkspaceId();
    if (pinned) query = query.eq("workspace_id", pinned);
    const { data, error } = await query;
    if (error) throw dbError(error);

    const workspaces: WorkspaceWithRole[] = (data ?? [])
      .map((row) => {
        const ws = row.workspaces as unknown as Workspace | null;
        if (!ws) return null;
        return { ...ws, role: row.role as Role };
      })
      .filter((w): w is WorkspaceWithRole => w !== null)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));

    return json({ workspaces });
  } catch (e) {
    return handleError(e);
  }
}


export async function POST() {
  try {
    await requireUser();
    // One client per deployment: the workspace is created and owned by the Yelema back-office.
    throw new ApiError(403, "forbidden", "Les espaces sont gérés par Yelema.");
  } catch (e) {
    return handleError(e);
  }
}
