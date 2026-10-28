import { redirect } from "next/navigation";
import { getSession, type DB } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { authViaBackoffice } from "@/lib/runtime-config";
import { pinnedWorkspaceId } from "@/lib/tenant";
import { currentInstance, currentPrincipal, workspaceOfMe } from "@/lib/session";
import { catalogueWithInstalled, profilesMirrored, userExperts, visibleAgents } from "@/lib/installed-experts";
import { backofficeAgents } from "@/lib/my-agents";
import { WorkspaceProvider } from "@/components/WorkspaceProvider";
import { UnlinkedAccount } from "@/components/UnlinkedAccount";
import { AppShell } from "@/components/app/AppShell";
import type { InitialExperts } from "@/components/experts/useExperts";
import type { CatalogueResponse, MergedAgent, Role, Workspace, WorkspaceWithRole } from "@/lib/types";

// Read the user's workspaces with two plain table queries joined in JS, NOT a PostgREST relationship
// embed (`memberships?select=role,workspaces(*)`). The embed needs the memberships→workspaces
// foreign key to be live in PostgREST's schema cache; right after a fresh `npm run setup` migration
// that cache can briefly lag, and the embed then comes back empty even though the rows exist. Plain
// selects don't depend on the relationship, and we surface real query errors instead of mistaking
// them for an empty result.
async function loadWorkspaces(db: DB, userId: string): Promise<WorkspaceWithRole[]> {
  // A deployment only ever shows its own client's workspace (shared database).
  let query = db.from("memberships").select("workspace_id, role").eq("user_id", userId);
  const pinned = await pinnedWorkspaceId();
  if (pinned) query = query.eq("workspace_id", pinned);
  const { data: memberships, error: memErr } = await query;
  if (memErr) throw new Error(`Couldn't load your workspaces: ${memErr.message}`);
  if (!memberships?.length) return [];

  const roleByWorkspace = new Map<string, Role>(
    memberships.map((m) => [m.workspace_id as string, m.role as Role])
  );
  const { data: workspaces, error: wsErr } = await db
    .from("workspaces")
    .select("*")
    .in("id", [...roleByWorkspace.keys()]);
  if (wsErr) throw new Error(`Couldn't load your workspaces: ${wsErr.message}`);

  return (workspaces ?? [])
    .map((ws) => ({ ...(ws as Workspace), role: roleByWorkspace.get((ws as Workspace).id)! }))
    .filter((w): w is WorkspaceWithRole => Boolean(w.role))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// What the shell shows from the start, read with the page so the menu, the home and the gallery
// arrive filled instead of asking for them once the page is up: the experts, the catalogue and the
// instance. Only when it costs no call into an instance (the profiles are mirrored); otherwise, or
// on any failure, the browser asks as before and shows the error itself.
async function loadInitialShell(workspaceId: string, userId: string, email: string | null): Promise<{ experts: InitialExperts | null; catalogue: CatalogueResponse | null; agents: MergedAgent[] | null }> {
  const none = { experts: null, catalogue: null, agents: null };
  try {
    const agents = await visibleAgents(createAdminClient(), workspaceId, userId);
    if (!profilesMirrored(agents)) return none;
    const [experts, catalogue, rows] = await Promise.all([
      userExperts(agents),
      catalogueWithInstalled(agents).catch(() => null),
      authViaBackoffice() ? backofficeAgents(email).catch(() => null) : null,
    ]);
    return { experts: { workspaceId, ...experts }, catalogue, agents: rows };
  } catch {
    return none;
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Asked now, alongside "who is this", so the experts below do not wait for it in turn.
  if (authViaBackoffice()) void currentInstance().catch(() => null);
  const { user } = await getSession();
  if (!user) redirect("/login");

  // Signed in through the back office: it already said which workspace this is and the user's role.
  // Otherwise table access goes through the privileged client; the user came from the verified
  // session above.
  const me = authViaBackoffice() ? await currentPrincipal() : null;
  // The whole workspace, its access included: a chat-only member gets the chat-only shell.
  const workspaces: WorkspaceWithRole[] = me
    ? [workspaceOfMe(me)]
    : authViaBackoffice()
      ? []
      : await loadWorkspaces(createAdminClient(), user.id);
  // One client per deployment: the back-office creates THE workspace and its admin, and everyone
  // else joins by invitation. A signed-in account with no membership is simply not attached yet.
  if (workspaces.length === 0) return <UnlinkedAccount email={user.email ?? ""} />;

  // Un seul chrome pour tout le groupe (app), espace expert compris : c'est ce qui remplace
  // l'écran de choix d'instance. Le <main> ne pose aucune marge — chaque page choisit son mode
  // en enveloppant ou non son contenu dans <Page>.
  const initial = await loadInitialShell(workspaces[0].id, user.id, user.email);

  return (
    <WorkspaceProvider initialWorkspaces={workspaces} userEmail={user.email ?? ""} userName={user.name} userFirstName={user.firstName} userAvatarUrl={me?.user.avatarUrl ?? null}>
      <AppShell initialExperts={initial.experts} initialAgents={initial.agents} initialCatalogue={initial.catalogue}>
        {children}
      </AppShell>
    </WorkspaceProvider>
  );
}
