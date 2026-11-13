-- PROPOSED — NOT APPLIED. Depends on 0001. Lab first.

-- 1. Hierarchy-enforcing role change. service_role only; the Next.js server passes the ALREADY-AUTHENTICATED actor id.
--    Rules (all enforced here, so a buggy/forged UI call cannot bypass them):
--      * nobody changes their own role (no self-promotion)
--      * the owner row can never be changed or assigned here (owner only via bootstrap_owner)
--      * owner      : may set any non-owner user to super_admin | admin | user
--      * super_admin: may only move users between 'user' <-> 'admin' (cannot touch super_admin/owner, cannot create super_admin)
--      * admin/user : no role management
--    Audit rows are written by trg_audit_role_change (actor via app.actor_id).
create or replace function public.change_user_role(p_actor uuid, p_target uuid, p_new_role text) returns text
language plpgsql security definer set search_path = public as $$
declare actor_role text; target_role text;
begin
  if p_new_role not in ('super_admin','admin','user') then raise exception 'invalid target role'; end if;
  if p_actor = p_target then raise exception 'you cannot change your own role'; end if;
  select role into actor_role  from public.user_roles where user_id = p_actor;
  select role into target_role from public.user_roles where user_id = p_target;
  if actor_role is null then raise exception 'actor has no role'; end if;
  if target_role is null then raise exception 'target user not found'; end if;
  if target_role = 'owner' then raise exception 'the owner cannot be modified'; end if;
  if target_role = p_new_role then return 'unchanged'; end if;

  if actor_role = 'owner' then
    null;
  elsif actor_role = 'super_admin' then
    if target_role not in ('user','admin') or p_new_role not in ('user','admin') then
      raise exception 'super_admin may only manage user/admin roles';
    end if;
  else
    raise exception 'not allowed to manage roles';
  end if;

  perform set_config('app.actor_id', p_actor::text, true);
  update public.user_roles set role = p_new_role, updated_by = p_actor where user_id = p_target;
  return 'changed';
end $$;
revoke all on function public.change_user_role(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.change_user_role(uuid, uuid, text) to service_role;

-- 2. Default permissions (idempotent). Owner is handled in code as "all", seeded here for display.
insert into public.role_permissions (role, permission) values
  ('user','profile.manage_own'),
  ('admin','users.read'), ('admin','content.manage'), ('admin','products.manage'), ('admin','reports.read'),
  ('super_admin','users.read'), ('super_admin','content.manage'), ('super_admin','products.manage'), ('super_admin','reports.read'),
  ('super_admin','users.manage'), ('super_admin','roles.manage_limited'), ('super_admin','blue_team.read'),
  ('super_admin','blue_team.triage'), ('super_admin','audit.read'),
  ('owner','users.read'), ('owner','users.manage'), ('owner','roles.manage'), ('owner','permissions.manage'),
  ('owner','content.manage'), ('owner','products.manage'), ('owner','reports.read'), ('owner','audit.read'),
  ('owner','settings.manage'), ('owner','red_team.manage'), ('owner','blue_team.read'), ('owner','blue_team.triage')
on conflict (role, permission) do nothing;
