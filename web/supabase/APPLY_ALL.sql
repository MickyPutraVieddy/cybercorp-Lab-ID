-- APPLY_ALL.sql — paste this WHOLE file into Supabase > SQL Editor > New query > Run. Run it ONCE per Supabase project.
-- It is idempotent: running it again is safe. Order: 0001 identity/RBAC -> 0002 role mgmt -> 0003 profile settings -> 0004 products.
-- After it succeeds, open https://<your-domain>/api/health : every table should say true.

-- ======================================================================
-- 0001_identity_rbac.sql
-- ======================================================================
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

-- ======================================================================
-- 0002_role_management_and_permissions.sql
-- ======================================================================
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

-- ======================================================================
-- 0003_profile_settings.sql
-- ======================================================================
-- 0003_profile_settings.sql  — PROPOSED, NOT APPLIED. Read it, then run in the LAB Supabase project only.
-- Adds: username (public-ish, on profiles) and private contact/shipping details (separate table, owner-only RLS).
-- Design choice: phone + address live in profile_details, NOT in profiles, because profiles has a "staff can read all"
-- policy (profiles_select_staff). Staff (admin / super_admin / owner) therefore can NOT read members' phone/address.
-- Idempotent: safe to re-run.

-- 1. username on profiles ------------------------------------------------------------------
alter table public.profiles add column if not exists username text;

alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username is null or (username ~ '^[a-z0-9][a-z0-9._]{1,22}[a-z0-9]$' and username !~ '[._]{2}'));

alter table public.profiles drop constraint if exists profiles_username_not_reserved;
alter table public.profiles add constraint profiles_username_not_reserved
  check (username is null or username not in ('admin','administrator','owner','superadmin','super_admin','root','support','staff','system','moderator','security','letstestit'));

create unique index if not exists profiles_username_unique on public.profiles (lower(username)) where username is not null;

-- Column privilege: members may now update full_name AND username on their own row (RLS profiles_update_own still applies).
revoke update on public.profiles from authenticated;
grant  update (full_name, username) on public.profiles to authenticated;

-- 2. private contact / shipping details -----------------------------------------------------
create table if not exists public.profile_details (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  phone        text check (phone is null or char_length(phone) between 6 and 20),
  address_line text check (address_line is null or char_length(address_line) <= 200),
  city         text check (city is null or char_length(city) <= 80),
  province     text check (province is null or char_length(province) <= 80),
  postal_code  text check (postal_code is null or char_length(postal_code) <= 12),
  updated_at   timestamptz not null default now()
);

alter table public.profile_details enable row level security;

drop policy if exists profile_details_select_own on public.profile_details;
create policy profile_details_select_own on public.profile_details for select to authenticated using (user_id = auth.uid());
drop policy if exists profile_details_insert_own on public.profile_details;
create policy profile_details_insert_own on public.profile_details for insert to authenticated with check (user_id = auth.uid());
drop policy if exists profile_details_update_own on public.profile_details;
create policy profile_details_update_own on public.profile_details for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Deliberately NO staff policy: admins cannot read other members' phone or address.

revoke all on public.profile_details from anon;
revoke delete, truncate on public.profile_details from authenticated;
grant select, insert, update on public.profile_details to authenticated;

-- 3. quick checks (run manually) -------------------------------------------------------------
-- select column_name from information_schema.columns where table_name='profiles';           -- username present
-- select policyname from pg_policies where tablename='profile_details';                       -- 3 own-row policies, no staff policy

-- ======================================================================
-- 0004_products_catalog.sql
-- ======================================================================
-- 0004_products_catalog.sql — products stored in Supabase + image bucket. Idempotent (safe to re-run). Depends on 0001 (touch_updated_at, current_app_role).
-- Reads : anyone may read PUBLISHED products (storefront); staff may read all (incl. drafts).
-- Writes: ONLY the Next.js server (service role) after it re-checks the 'products.manage' permission. No client can write.

create table if not exists public.products (
  id              text primary key check (id ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category        text not null check (category in ('packs','camp','apparel','travel','hydration','essentials')),
  name_en         text not null check (char_length(name_en) between 2 and 120),
  name_id         text not null check (char_length(name_id) between 2 and 120),
  description_en  text not null default '' check (char_length(description_en) <= 1000),
  description_id  text not null default '' check (char_length(description_id) <= 1000),
  specifications  jsonb not null default '[]'::jsonb,
  price_idr       integer not null check (price_idr >= 0 and price_idr <= 1000000000),
  stock           integer not null default 0 check (stock >= 0 and stock <= 1000000),
  rating          numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count    integer not null default 0 check (review_count >= 0),
  is_new          boolean not null default false,
  best_seller     boolean not null default false,
  published       boolean not null default true,
  image_path      text check (image_path is null or char_length(image_path) <= 200),
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists products_category_idx on public.products (category);

drop trigger if exists trg_products_touch on public.products;
create trigger trg_products_touch before update on public.products for each row execute function public.touch_updated_at();

alter table public.products enable row level security;

drop policy if exists products_select_published on public.products;
create policy products_select_published on public.products for select to anon, authenticated using (published);
drop policy if exists products_select_staff on public.products;
create policy products_select_staff on public.products for select to authenticated
  using (public.current_app_role() in ('owner','super_admin','admin'));

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

-- Image bucket: public read, writes only via the server (service role bypasses storage RLS; no client policies exist).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 2097152, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- Seed: the 36 demo products that used to live in src/catalog/products.ts (never overwrites rows you already edited).
insert into public.products (id, slug, category, name_en, name_id, description_en, description_id, specifications, price_idr, stock, rating, review_count, is_new, best_seller) values
  ('p-001', 'ridge-28-pack', 'packs', 'Ridge 28L Daypack', 'Ridge 28L Daypack', 'A balanced daypack with a breathable back panel and room for a long, unhurried day outside.', 'Ransel harian seimbang dengan panel punggung sejuk dan ruang untuk seharian menjelajah.', '[{"en":"28 litre capacity","id":"Kapasitas 28 liter"},{"en":"Recycled ripstop shell","id":"Bahan ripstop daur ulang"},{"en":"Padded laptop sleeve","id":"Kompartemen laptop berlapis"}]'::jsonb, 1280000, 18, 4.8, 42, false, true),
  ('p-002', 'switchback-45-pack', 'packs', 'Switchback 45L Pack', 'Switchback 45L Pack', 'A trail-ready carry system for weekend routes and lighter overnight kits.', 'Sistem bawaan siap jalur untuk perjalanan akhir pekan dan perlengkapan bermalam.', '[{"en":"45 litre capacity","id":"Kapasitas 45 liter"},{"en":"Adjustable torso fit","id":"Panjang punggung dapat diatur"},{"en":"Rain cover included","id":"Termasuk pelindung hujan"}]'::jsonb, 2450000, 7, 4.9, 28, false, true),
  ('p-003', 'everywhere-sling', 'packs', 'Everywhere Sling', 'Everywhere Sling', 'A compact crossbody for passports, trail snacks, and the small things worth keeping close.', 'Tas selempang ringkas untuk paspor, camilan, dan barang kecil yang perlu dijangkau.', '[{"en":"3 litre capacity","id":"Kapasitas 3 liter"},{"en":"Two-way adjustable strap","id":"Tali dua arah yang dapat diatur"},{"en":"Water-resistant lining","id":"Lapisan tahan air"}]'::jsonb, 590000, 0, 4.7, 17, false, false),
  ('p-004', 'summit-duffel-55', 'packs', 'Summit Duffel 55L', 'Summit Duffel 55L', 'A wide-opening duffel that moves easily from the car boot to the cabin floor.', 'Tas duffel bukaan lebar yang praktis dari bagasi mobil hingga kabin.', '[{"en":"55 litre capacity","id":"Kapasitas 55 liter"},{"en":"Stowable shoulder straps","id":"Tali bahu yang dapat disimpan"},{"en":"Lockable zip pulls","id":"Resleting dengan lubang kunci"}]'::jsonb, 1680000, 13, 4.6, 11, true, false),
  ('p-005', 'daybreak-tote', 'packs', 'Daybreak Utility Tote', 'Daybreak Utility Tote', 'A sturdy grab-and-go tote with pockets for a market morning or a lakeside lunch.', 'Tas serbaguna kokoh dengan banyak kantong untuk pagi di pasar atau makan siang di tepi danau.', '[{"en":"18 litre capacity","id":"Kapasitas 18 liter"},{"en":"Reinforced base","id":"Bagian bawah diperkuat"},{"en":"Internal key clip","id":"Pengait kunci di bagian dalam"}]'::jsonb, 420000, 26, 4.5, 9, false, false),
  ('p-006', 'trail-organizer-set', 'packs', 'Trail Organizer Set', 'Set Organizer Trail', 'Three light packing cubes that bring a little order to the bottom of any bag.', 'Tiga kubus penyimpanan ringan untuk menjaga isi tas tetap rapi.', '[{"en":"Set of three sizes","id":"Set berisi tiga ukuran"},{"en":"Breathable mesh panels","id":"Panel jaring yang sejuk"},{"en":"Recycled polyester","id":"Poliester daur ulang"}]'::jsonb, 365000, 31, 4.4, 14, false, false),
  ('p-007', 'little-pine-2-tent', 'camp', 'Little Pine 2P Tent', 'Little Pine 2P Tent', 'A two-person shelter with a straightforward pitch and enough vestibule space for muddy boots.', 'Tenda dua orang yang mudah dipasang dengan ruang teras untuk sepatu berlumpur.', '[{"en":"2-person, 3-season","id":"2 orang, 3 musim"},{"en":"2.1 kg packed weight","id":"Berat kemasan 2,1 kg"},{"en":"Dual vestibules","id":"Dua teras samping"}]'::jsonb, 3280000, 5, 4.9, 36, false, true),
  ('p-008', 'open-sky-tarp', 'camp', 'Open Sky Tarp', 'Open Sky Tarp', 'A flexible patch of shade for slow lunches, sudden showers, and evenings outside.', 'Naungan serbaguna untuk makan siang santai, hujan mendadak, dan malam di luar.', '[{"en":"3 × 3 metre coverage","id":"Perlindungan 3 × 3 meter"},{"en":"Six tie-out points","id":"Enam titik pengikat"},{"en":"Packs into its own sack","id":"Dapat dilipat ke kantongnya"}]'::jsonb, 1190000, 12, 4.6, 13, false, false),
  ('p-009', 'cloudline-20-sleeping-bag', 'camp', 'Cloudline 20 Sleeping Bag', 'Cloudline 20 Sleeping Bag', 'A soft, roomy sleeping bag for cool nights at camp and early starts.', 'Kantong tidur lembut dan lega untuk malam sejuk di perkemahan.', '[{"en":"Comfort rating: 8°C","id":"Suhu nyaman: 8°C"},{"en":"Recycled synthetic fill","id":"Isian sintetis daur ulang"},{"en":"Two-way zip","id":"Resleting dua arah"}]'::jsonb, 1860000, 9, 4.7, 22, true, false),
  ('p-010', 'groundwork-sleeping-pad', 'camp', 'Groundwork Sleeping Pad', 'Groundwork Sleeping Pad', 'A quiet, supportive layer between you and the cold ground.', 'Lapisan nyaman yang memisahkan tubuh dari tanah yang dingin.', '[{"en":"R-value 3.2","id":"Nilai R 3,2"},{"en":"Inflates in under two minutes","id":"Mengembang dalam waktu kurang dari dua menit"},{"en":"Repair kit included","id":"Termasuk kit perbaikan"}]'::jsonb, 1420000, 16, 4.5, 19, false, false),
  ('p-011', 'emberlight-camp-lantern', 'camp', 'Emberlight Camp Lantern', 'Emberlight Camp Lantern', 'Warm, dimmable light for the table, tent, or one last cup of tea.', 'Cahaya hangat yang dapat diredupkan untuk meja, tenda, atau secangkir teh.', '[{"en":"Three brightness levels","id":"Tiga tingkat kecerahan"},{"en":"USB-C rechargeable","id":"Dapat diisi ulang USB-C"},{"en":"Up to 40 hours per charge","id":"Hingga 40 jam per pengisian"}]'::jsonb, 680000, 21, 4.8, 31, false, false),
  ('p-012', 'camp-kitchen-roll', 'camp', 'Camp Kitchen Roll', 'Camp Kitchen Roll', 'A tidy roll for the little utensils that make outdoor meals feel like home.', 'Penyimpanan ringkas untuk alat makan yang membuat hidangan luar terasa seperti di rumah.', '[{"en":"Six elastic tool loops","id":"Enam lingkar elastis"},{"en":"Wipe-clean recycled fabric","id":"Kain daur ulang yang mudah dibersihkan"},{"en":"Hanging loop included","id":"Termasuk loop untuk digantung"}]'::jsonb, 315000, 22, 4.3, 8, false, false),
  ('p-013', 'switchback-shell', 'apparel', 'Switchback Rain Shell', 'Switchback Rain Shell', 'A packable outer layer for weather that changes its mind halfway up the trail.', 'Lapisan luar yang mudah disimpan untuk cuaca yang berubah di tengah perjalanan.', '[{"en":"2.5-layer recycled shell","id":"Cangkang daur ulang 2,5 lapis"},{"en":"Adjustable hood and cuffs","id":"Tudung dan manset dapat diatur"},{"en":"Packs into hand pocket","id":"Dapat dilipat ke saku tangan"}]'::jsonb, 2190000, 11, 4.8, 25, false, true),
  ('p-014', 'high-country-fleece', 'apparel', 'High Country Fleece', 'High Country Fleece', 'A breathable mid-layer for cool mornings and long stops to take in the view.', 'Lapisan tengah yang sejuk untuk pagi dingin dan berhenti menikmati pemandangan.', '[{"en":"Recycled grid fleece","id":"Fleece grid daur ulang"},{"en":"Flatlock seams","id":"Jahitan flatlock"},{"en":"Zipped chest pocket","id":"Saku dada beresleting"}]'::jsonb, 1140000, 17, 4.7, 16, false, false),
  ('p-015', 'all-day-trail-shirt', 'apparel', 'All-Day Trail Shirt', 'All-Day Trail Shirt', 'A quick-drying everyday shirt with a relaxed shape and sleeves that roll neatly.', 'Kemeja harian cepat kering dengan potongan santai dan lengan yang mudah digulung.', '[{"en":"Organic cotton blend","id":"Campuran katun organik"},{"en":"UPF 30+ fabric","id":"Bahan UPF 30+"},{"en":"Button chest pocket","id":"Saku dada berkancing"}]'::jsonb, 575000, 24, 4.5, 12, false, false),
  ('p-016', 'ridgeway-trail-pants', 'apparel', 'Ridgeway Trail Pants', 'Ridgeway Trail Pants', 'Stretch-woven trousers cut for a full stride, from city edges to rocky switchbacks.', 'Celana lentur dengan potongan bebas untuk langkah panjang di jalan dan jalur berbatu.', '[{"en":"Four-way stretch fabric","id":"Bahan lentur empat arah"},{"en":"Articulated knees","id":"Bagian lutut berartikulasi"},{"en":"Six practical pockets","id":"Enam saku praktis"}]'::jsonb, 985000, 15, 4.6, 18, false, false),
  ('p-017', 'sunward-cap', 'apparel', 'Sunward Five-Panel Cap', 'Sunward Five-Panel Cap', 'A light five-panel cap for bright trailheads and slow afternoon walks.', 'Topi lima panel ringan untuk awal perjalanan dan jalan sore.', '[{"en":"Adjustable rear strap","id":"Tali belakang yang dapat diatur"},{"en":"Moisture-wicking band","id":"Pita penyerap keringat"},{"en":"Recycled nylon","id":"Nilon daur ulang"}]'::jsonb, 325000, 28, 4.4, 10, true, false),
  ('p-018', 'camp-cabin-socks', 'apparel', 'Camp Cabin Socks', 'Camp Cabin Socks', 'A cushioned merino blend pair for chilly mornings around camp.', 'Kaus kaki campuran merino berlapis lembut untuk pagi sejuk di perkemahan.', '[{"en":"Merino wool blend","id":"Campuran wol merino"},{"en":"Cushioned heel and toe","id":"Tumit dan ujung berlapis"},{"en":"Made in a pair","id":"Dijual sepasang"}]'::jsonb, 245000, 33, 4.8, 27, false, false),
  ('p-019', 'overnight-roller-40', 'travel', 'Overnight Roller 40L', 'Overnight Roller 40L', 'A compact rolling carry-on that keeps a weekend itinerary within easy reach.', 'Tas beroda ringkas untuk menjaga perlengkapan akhir pekan tetap mudah dijangkau.', '[{"en":"40 litre capacity","id":"Kapasitas 40 liter"},{"en":"Cabin-size dimensions","id":"Ukuran kabin"},{"en":"Quiet two-wheel system","id":"Sistem dua roda yang senyap"}]'::jsonb, 2780000, 4, 4.7, 21, false, false),
  ('p-020', 'passport-pouch', 'travel', 'Faraway Passport Pouch', 'Faraway Passport Pouch', 'A slim organiser that keeps travel documents together without adding bulk.', 'Organizer tipis yang menyatukan dokumen perjalanan tanpa menambah beban.', '[{"en":"RFID-shielded passport sleeve","id":"Selongsong paspor berpelindung RFID"},{"en":"Four card slots","id":"Empat slot kartu"},{"en":"Recycled canvas outer","id":"Bagian luar kanvas daur ulang"}]'::jsonb, 390000, 20, 4.5, 14, false, false),
  ('p-021', 'weekender-overnight-bag', 'travel', 'Weekender Overnight Bag', 'Weekender Overnight Bag', 'A roomy, soft-sided bag for a change of plans and a couple of nights away.', 'Tas fleksibel dan lega untuk perubahan rencana dan perjalanan beberapa malam.', '[{"en":"32 litre capacity","id":"Kapasitas 32 liter"},{"en":"Shoe compartment","id":"Kompartemen sepatu"},{"en":"Luggage sleeve","id":"Selongsong pegangan koper"}]'::jsonb, 1190000, 14, 4.6, 23, false, true),
  ('p-022', 'packable-market-tote', 'travel', 'Packable Market Tote', 'Packable Market Tote', 'A surprisingly strong spare tote that folds down to the size of a paperback.', 'Tas tambahan yang kuat dan dapat dilipat sekecil buku saku.', '[{"en":"Holds up to 15 kg","id":"Menahan beban hingga 15 kg"},{"en":"Folds into corner pocket","id":"Dapat dilipat ke saku sudut"},{"en":"Machine washable","id":"Dapat dicuci dengan mesin"}]'::jsonb, 185000, 42, 4.3, 7, false, false),
  ('p-023', 'long-haul-eye-mask', 'travel', 'Long Haul Eye Mask', 'Long Haul Eye Mask', 'A soft contoured mask for a quieter nap on the train, plane, or tent floor.', 'Masker lembut untuk tidur sejenak di kereta, pesawat, atau tenda.', '[{"en":"Adjustable elastic strap","id":"Tali elastis yang dapat diatur"},{"en":"Breathable cotton lining","id":"Lapisan katun sejuk"},{"en":"Washable travel pouch","id":"Kantong perjalanan yang dapat dicuci"}]'::jsonb, 160000, 35, 4.2, 9, false, false),
  ('p-024', 'roam-tech-organizer', 'travel', 'Roam Tech Organizer', 'Roam Tech Organizer', 'A padded case that makes cords and chargers easier to find at the other end.', 'Tas berlapis agar kabel dan pengisi daya lebih mudah ditemukan.', '[{"en":"Stretch cable loops","id":"Loop kabel elastis"},{"en":"Padded divider","id":"Pembatas berlapis"},{"en":"Water-resistant shell","id":"Cangkang tahan air"}]'::jsonb, 440000, 19, 4.6, 15, true, false),
  ('p-025', 'clearwater-filter-bottle', 'hydration', 'Clearwater Filter Bottle', 'Clearwater Filter Bottle', 'A reusable bottle with a replaceable filter for filling up along the way.', 'Botol pakai ulang dengan filter yang dapat diganti untuk mengisi ulang di perjalanan.', '[{"en":"750 ml capacity","id":"Kapasitas 750 ml"},{"en":"Replaceable carbon filter","id":"Filter karbon yang dapat diganti"},{"en":"BPA-free materials","id":"Bahan bebas BPA"}]'::jsonb, 735000, 10, 4.8, 33, false, true),
  ('p-026', 'switchback-insulated-flask', 'hydration', 'Switchback Insulated Flask', 'Switchback Insulated Flask', 'A double-wall bottle for hot coffee at dawn and cold water after the climb.', 'Botol dinding ganda untuk kopi hangat saat fajar dan air dingin setelah mendaki.', '[{"en":"600 ml capacity","id":"Kapasitas 600 ml"},{"en":"18-hour cold retention","id":"Menjaga dingin hingga 18 jam"},{"en":"Leak-resistant lid","id":"Tutup tahan bocor"}]'::jsonb, 485000, 25, 4.7, 29, false, false),
  ('p-027', 'folding-camp-mug', 'hydration', 'Folding Camp Mug', 'Folding Camp Mug', 'A light, easy-clean mug with a folding handle that makes room in a small kit.', 'Cangkir ringan dan mudah dibersihkan dengan pegangan lipat.', '[{"en":"350 ml capacity","id":"Kapasitas 350 ml"},{"en":"Food-grade silicone","id":"Silikon standar pangan"},{"en":"BPA-free","id":"Bebas BPA"}]'::jsonb, 220000, 29, 4.4, 12, false, false),
  ('p-028', 'everyday-soft-flask', 'hydration', 'Everyday Soft Flask', 'Everyday Soft Flask', 'A flexible flask that tucks into a running vest and shrinks as you drink.', 'Botol fleksibel yang pas di rompi lari dan mengecil saat diminum.', '[{"en":"500 ml capacity","id":"Kapasitas 500 ml"},{"en":"Wide-mouth opening","id":"Bukaan lebar"},{"en":"Dishwasher safe","id":"Aman untuk mesin pencuci piring"}]'::jsonb, 285000, 18, 4.5, 11, false, false),
  ('p-029', 'pour-over-travel-kit', 'hydration', 'Pour-Over Travel Kit', 'Pour-Over Travel Kit', 'A tiny brew set for quiet mornings when the view deserves a proper cup.', 'Set seduh ringkas untuk pagi tenang dengan pemandangan yang pantas dinikmati.', '[{"en":"Collapsible silicone dripper","id":"Dripper silikon yang dapat dilipat"},{"en":"Reusable mesh filter","id":"Filter jaring pakai ulang"},{"en":"Carry case included","id":"Termasuk tas kecil"}]'::jsonb, 545000, 8, 4.6, 18, true, false),
  ('p-030', 'trail-hydration-bladder', 'hydration', 'Trail Hydration Bladder', 'Trail Hydration Bladder', 'A low-profile reservoir that keeps a steady sip close on long, warm routes.', 'Reservoir tipis agar air mudah dijangkau di perjalanan panjang dan hangat.', '[{"en":"2 litre capacity","id":"Kapasitas 2 liter"},{"en":"Wide slide-seal opening","id":"Bukaan lebar dengan segel geser"},{"en":"Quick-disconnect hose","id":"Selang dengan konektor cepat"}]'::jsonb, 395000, 13, 4.5, 16, false, false),
  ('p-031', 'headland-headlamp', 'essentials', 'Headland Headlamp', 'Headland Headlamp', 'Hands-free light for the first miles before sunrise and the last steps back to camp.', 'Lampu praktis untuk langkah sebelum matahari terbit dan kembali ke tenda.', '[{"en":"350 lumen output","id":"Kecerahan 350 lumen"},{"en":"USB-C rechargeable","id":"Dapat diisi ulang USB-C"},{"en":"Red-light night mode","id":"Mode cahaya merah malam"}]'::jsonb, 575000, 17, 4.8, 26, false, true),
  ('p-032', 'field-notes-compass', 'essentials', 'Field Notes Compass', 'Field Notes Compass', 'A reliable baseplate compass for learning the shape of a map and the land.', 'Kompas baseplate untuk memahami peta dan bentang alam.', '[{"en":"Liquid-filled capsule","id":"Kapsul berisi cairan"},{"en":"Declination scale","id":"Skala deklinasi"},{"en":"Lanyard included","id":"Termasuk tali gantung"}]'::jsonb, 295000, 23, 4.6, 19, false, false),
  ('p-033', 'quick-dry-trail-towel', 'essentials', 'Quick-Dry Trail Towel', 'Quick-Dry Trail Towel', 'A soft pack towel that dries fast after a swim, a shower, or a rain-soaked day.', 'Handuk perjalanan lembut yang cepat kering setelah berenang atau kehujanan.', '[{"en":"Medium: 60 × 120 cm","id":"Ukuran sedang: 60 × 120 cm"},{"en":"Recycled microfibre","id":"Mikrofiber daur ulang"},{"en":"Hanging loop","id":"Loop untuk digantung"}]'::jsonb, 245000, 20, 4.4, 14, false, false),
  ('p-034', 'repair-and-care-kit', 'essentials', 'Repair & Care Kit', 'Repair & Care Kit', 'A small kit for the quick fixes that help favourite gear travel farther.', 'Kit ringkas untuk perbaikan kecil agar perlengkapan favorit lebih awet.', '[{"en":"Ten repair patches","id":"Sepuluh patch perbaikan"},{"en":"Seam sealer tube","id":"Tabung perekat jahitan"},{"en":"Packed in a recycled pouch","id":"Dikemas dalam kantong daur ulang"}]'::jsonb, 185000, 30, 4.3, 8, false, false),
  ('p-035', 'wayfinder-first-aid-pouch', 'essentials', 'Wayfinder First Aid Pouch', 'Wayfinder First Aid Pouch', 'An organised, empty pouch for assembling a personal first-aid kit.', 'Kantong kosong yang tertata untuk menyusun perlengkapan pertolongan pertama.', '[{"en":"Clearly marked compartments","id":"Kompartemen dengan penanda jelas"},{"en":"Water-resistant fabric","id":"Kain tahan air"},{"en":"Contents not included","id":"Isi perlengkapan tidak termasuk"}]'::jsonb, 175000, 26, 4.5, 12, true, false),
  ('p-036', 'field-kit-multi-tool', 'essentials', 'Field Kit Multi-tool', 'Field Kit Multi-tool', 'A pocket-size stainless multi-tool for the small jobs around camp and home.', 'Perkakas multifungsi kecil dari baja tahan karat untuk kebutuhan ringan.', '[{"en":"Nine everyday functions","id":"Sembilan fungsi sehari-hari"},{"en":"Stainless steel body","id":"Bodi baja tahan karat"},{"en":"Protective carry sleeve","id":"Selongsong pelindung"}]'::jsonb, 365000, 11, 4.6, 20, false, false)
on conflict (id) do nothing;
