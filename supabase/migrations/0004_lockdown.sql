-- Projet partagé entre tous les clients : seul le service role (back-office) appelle ces fonctions.
-- get_workspace_members et accept_invitation n'ont aucun contrôle d'appelant : jamais exécutables par anon/authenticated.
revoke execute on function public.get_workspace_members(uuid), public.get_invitation(uuid),
  public.accept_invitation(uuid, uuid), public.is_workspace_member(uuid), public.is_workspace_admin(uuid),
  public.handle_new_workspace()
  from public, anon, authenticated;
grant execute on function public.get_workspace_members(uuid), public.get_invitation(uuid),
  public.accept_invitation(uuid, uuid), public.is_workspace_member(uuid), public.is_workspace_admin(uuid)
  to service_role;
revoke all on public.workspaces, public.memberships, public.invitations, public.agents from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

-- Clés étrangères sans index : chaque suppression d'utilisateur du projet partagé parcourait ces tables.
create index if not exists workspaces_owner_idx on public.workspaces (owner_id);
create index if not exists invitations_workspace_idx on public.invitations (workspace_id, created_at desc);
create index if not exists invitations_created_by_idx on public.invitations (created_by) where created_by is not null;
create index if not exists agents_owner_user_idx on public.agents (owner_user_id) where owner_user_id is not null;
create index if not exists agents_created_by_idx on public.agents (created_by) where created_by is not null;
