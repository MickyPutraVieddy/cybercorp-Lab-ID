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
