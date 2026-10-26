import { requireMember, requireUser } from "@/lib/auth";
import { backoffice, BackofficeError } from "@/lib/backoffice";
import { ApiError, handleError, json, dbError, readJson } from "@/lib/http";
import { authViaBackoffice } from "@/lib/runtime-config";
import { currentPrincipal, readSession } from "@/lib/session";
import type { Invitation, MemberRoom, Role, WorkspaceMember } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { db, user } = await requireUser();
    const role = await requireMember(db, id, user.id);

    if (authViaBackoffice()) return json({ ...(await backofficeMembers(role)), invitations: [], role });

    const { data: members, error } = await db.rpc("get_workspace_members", { p_workspace: id });
    if (error) throw dbError(error);

    let invitations: Invitation[] = [];
    if (role === "admin") {
      const { data: inv } = await db
        .from("invitations")
        .select("*")
        .eq("workspace_id", id)
        .order("created_at", { ascending: false });
      invitations = (inv as Invitation[]) ?? [];
    }

    return json({ members: (members as WorkspaceMember[]) ?? [], invitations, role });
  } catch (e) {
    return handleError(e);
  }
}

// The members as the back office lists them, with the seats. Only an admin gets the list; a member
// sees their own line, which is all the back office would tell them.
async function backofficeMembers(role: Role): Promise<{ members: WorkspaceMember[] } & Partial<MemberRoom>> {
  const [session, me] = await Promise.all([readSession(), currentPrincipal()]);
  if (!session || !me) return { members: [] };
  if (role !== "admin") {
    return { members: [{ user_id: me.user.id, email: me.user.email, name: me.user.name, role: me.user.role, created_at: null }] };
  }
  try {
    const { items, quota, seats, enterpriseOpen } = await backoffice.members(session.accessToken);
    const members = items.map((m) => ({
      user_id: m.email,
      id: m.id,
      email: m.email,
      name: m.name,
      role: m.role,
      status: m.status,
      access: m.access,
      removable: m.removable,
      instance_name: m.instance?.name ?? null,
      created_at: m.instance?.createdAt ?? null,
    }));
    return { members, quota, seats, enterpriseOpen };
  } catch (e) {
    if (e instanceof BackofficeError) throw new ApiError(e.status, e.code, e.message);
    throw e;
  }
}

// An admin invites someone to the enterprise chat; the back office creates the account and checks the
// subscription's user quota and the chat's seats. Members with Experts stay Yelema's to add.
export async function POST(request: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const { db, user } = await requireUser();
    const role = await requireMember(db, id, user.id);
    if (!authViaBackoffice() || role !== "admin") throw new ApiError(403, "forbidden", "Réservé aux administrateurs de l’espace.");
    const body = await readJson<{ email?: unknown; firstName?: unknown; lastName?: unknown }>(request);
    const field = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const session = await readSession();
    if (!session) throw new ApiError(401, "unauthorized", "Session expirée.");
    try {
      return json(await backoffice.inviteMember(session.accessToken, { email: field(body.email, 254), firstName: field(body.firstName, 60), lastName: field(body.lastName, 60) }));
    } catch (e) {
      if (e instanceof BackofficeError) throw new ApiError(e.status, e.code, e.message);
      throw e;
    }
  } catch (e) {
    return handleError(e);
  }
}
