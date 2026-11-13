-- PROPOSED — NOT APPLIED (revision 2 after self-review). Run ONLY in the Security Lab project first.
-- Re-runnable (idempotent). Order: 0001 then 0002.
--
-- Review fixes vs revision 1:
--  * audit_logs.actor_id had FK ... ON DELETE SET NULL; that UPDATE is blocked by the append-only trigger, so
--    deleting any user would have FAILED. actor_id is now a plain uuid (no FK).
--  * user_roles.updated_by FK now ON DELETE SET NULL.
--  * profiles: clients may update ONLY full_name (column privilege), not email/id.
--  * TRUNCATE on audit_logs blocked too.
--  * Role/permission changes are audited by DB triggers (every path, not only app code).
--  * Policies/triggers are drop-if-exists + create so the script can be re-run.
--  * Backfill for auth.users that existed before the signup trigger.

create extension if not exists pgcrypto;

-- 1. profiles -------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text check (char_length(full_name) <= 120),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. user_roles (authoritative role source; user_metadata is never used) -----
create table if not exists public.user_roles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'user' check (role in ('owner','super_admin','admin','user')),
  updated_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists user_roles_single_owner on public.user_roles ((role)) where role = 'owner';

-- 3. role_permissions -----------------------------------------------------
create table if not exists public.role_permissions (
  id          uuid primary key default gen_random_uuid(),
  role        text not null check (role in ('owner','super_admin','admin','user')),
  permission  text not null,
  created_at  timestamptz not null default now(),
  unique (role, permission)
);

-- 4. audit_logs (append-only; no FK so user deletion never needs an UPDATE) ---
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid,
  action      text not null,
  target_type text,
  target_id   text,
  metadata    jsonb not null default '{}'::jsonb,   -- never store passwords/tokens/keys
  environment text not null default 'development',
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_idx   on public.audit_logs (actor_id);

-- 5. security_events (server-written telemetry) -----------------------------
create table if not exists public.security_events (
  id              uuid primary key default gen_random_uuid(),
  occurred_at     timestamptz not null default now(),
  actor_id        uuid,
  event_type      text not null,
  endpoint        text,
  http_method     text,
  response_status int,
  source_ip_hash  text,
  environment     text not null default 'development',
  correlation_id  text,
  classification  text not null default 'normal'
                  check (classification in ('normal','suspicious','confirmed_violation','verified_exploitation')),
  metadata        jsonb not null default '{}'::jsonb
);
create index if not exists sec_events_time_idx  on public.security_events (occurred_at desc);
create index if not exists sec_events_type_idx  on public.security_events (event_type, occurred_at desc);
create index if not exists sec_events_actor_idx on public.security_events (actor_id, occurred_at desc);

-- 6. updated_at ---------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_profiles_touch on public.profiles;
create trigger trg_profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists trg_user_roles_touch on public.user_roles;
create trigger trg_user_roles_touch before update on public.user_roles for each row execute function public.touch_updated_at();

-- 7. Signup => ALWAYS role 'user' (client-supplied metadata cannot set a role) --
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(coalesce(new.raw_user_meta_data->>'full_name',''), 120))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- 8. Role helper for RLS -------------------------------------------------------
create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = auth.uid()
$$;
revoke all on function public.current_app_role() from public, anon;
grant execute on function public.current_app_role() to authenticated;

-- 9. Owner protection ---------------------------------------------------------------
create or replace function public.protect_owner() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    raise exception 'owner row cannot be deleted';
  end if;
  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    raise exception 'owner cannot be demoted';
  end if;
  if tg_op = 'UPDATE' and new.role = 'owner' and old.role <> 'owner'
     and coalesce(current_setting('app.owner_bootstrap', true), '') <> 'on' then
    raise exception 'owner can only be assigned by bootstrap_owner()';
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_protect_owner on public.user_roles;
create trigger trg_protect_owner before update or delete on public.user_roles
  for each row execute function public.protect_owner();

-- 10. Audit triggers: every role / permission change is recorded, on any code path ---
create or replace function public.audit_role_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor uuid := nullif(current_setting('app.actor_id', true), '')::uuid;
begin
  if tg_op = 'INSERT' then
    if new.role <> 'user' then
      insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
      values (actor, 'role_assigned', 'user', new.user_id::text, jsonb_build_object('new_role', new.role));
    end if;
  elsif tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
      values (actor, 'role_changed', 'user', new.user_id::text,
              jsonb_build_object('old_role', old.role, 'new_role', new.role));
    end if;
  elsif tg_op = 'DELETE' then
    insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
    values (actor, 'role_removed', 'user', old.user_id::text, jsonb_build_object('old_role', old.role));
  end if;
  return coalesce(new, old);
end $$;
drop trigger if exists trg_audit_role_change on public.user_roles;
create trigger trg_audit_role_change after insert or update or delete on public.user_roles
  for each row execute function public.audit_role_change();

create or replace function public.audit_permission_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor uuid := nullif(current_setting('app.actor_id', true), '')::uuid;
begin
  insert into public.audit_logs(actor_id, action, target_type, target_id, metadata)
  values (actor,
          case tg_op when 'INSERT' then 'permission_granted' when 'DELETE' then 'permission_revoked' else 'permission_changed' end,
          'role', coalesce(new.role, old.role),
          jsonb_build_object('permission', coalesce(new.permission, old.permission)));
  return coalesce(new, old);
end $$;
drop trigger if exists trg_audit_permission_change on public.role_permissions;
create trigger trg_audit_permission_change after insert or update or delete on public.role_permissions
  for each row execute function public.audit_permission_change();

-- 11. Idempotent owner bootstrap (service_role only) ------------------------------------
create or replace function public.bootstrap_owner(p_owner_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  if not exists (select 1 from auth.users where id = p_owner_id and email_confirmed_at is not null) then
    raise exception 'owner user does not exist or email is not confirmed';
  end if;
  select user_id into existing from public.user_roles where role = 'owner';
  if existing = p_owner_id then return 'already_owner'; end if;
  if existing is not null then raise exception 'a different owner already exists'; end if;
  perform set_config('app.owner_bootstrap', 'on', true);
  perform set_config('app.actor_id', p_owner_id::text, true);
  insert into public.user_roles (user_id, role, updated_by) values (p_owner_id, 'owner', p_owner_id)
    on conflict (user_id) do update set role = 'owner', updated_by = p_owner_id;
  return 'owner_assigned';
end $$;
revoke all on function public.bootstrap_owner(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_owner(uuid) to service_role;

-- 12. Append-only audit logs -------------------------------------------------------------
create or replace function public.block_mutation() returns trigger
language plpgsql set search_path = public as $$
begin raise exception '% is append-only', tg_table_name; end $$;
drop trigger if exists trg_audit_no_update on public.audit_logs;
create trigger trg_audit_no_update before update or delete on public.audit_logs
  for each row execute function public.block_mutation();
drop trigger if exists trg_audit_no_truncate on public.audit_logs;
create trigger trg_audit_no_truncate before truncate on public.audit_logs
  for each statement execute function public.block_mutation();

-- 13. RLS --------------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs       enable row level security;
alter table public.security_events  enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles for select to authenticated
  using (public.current_app_role() in ('owner','super_admin','admin'));
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists user_roles_select_own on public.user_roles;
create policy user_roles_select_own on public.user_roles for select to authenticated using (user_id = auth.uid());
drop policy if exists user_roles_select_staff on public.user_roles;
create policy user_roles_select_staff on public.user_roles for select to authenticated
  using (public.current_app_role() in ('owner','super_admin','admin'));

-- Any logged-in user may read permissions of THEIR OWN role (needed for server-side checks); staff may read all.
drop policy if exists role_perms_select on public.role_permissions;
create policy role_perms_select on public.role_permissions for select to authenticated
  using (role = public.current_app_role() or public.current_app_role() in ('owner','super_admin','admin'));

drop policy if exists audit_select_privileged on public.audit_logs;
create policy audit_select_privileged on public.audit_logs for select to authenticated
  using (public.current_app_role() in ('owner','super_admin'));
drop policy if exists sec_events_select_privileged on public.security_events;
create policy sec_events_select_privileged on public.security_events for select to authenticated
  using (public.current_app_role() in ('owner','super_admin'));

-- 14. Privileges ----------------------------------------------------------------------------
revoke all on public.profiles, public.user_roles, public.role_permissions, public.audit_logs, public.security_events from anon;
revoke insert, update, delete, truncate on public.user_roles, public.role_permissions, public.audit_logs, public.security_events from authenticated;
revoke insert, delete, truncate on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant  update (full_name) on public.profiles to authenticated;

-- 15. Backfill users created before the trigger existed (all become 'user') --------------------
insert into public.profiles (id, email, full_name)
  select id, email, left(coalesce(raw_user_meta_data->>'full_name',''), 120) from auth.users
  on conflict (id) do nothing;
insert into public.user_roles (user_id, role) select id, 'user' from auth.users on conflict (user_id) do nothing;
