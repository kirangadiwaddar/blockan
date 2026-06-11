-- ============================================================
-- Migration: Fix invite lookup + expand roles
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add email column to profiles and sync from auth.users
alter table public.profiles add column if not exists email text;

-- Backfill email for existing users
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 2. Update the new-user trigger to also copy email
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$;

-- 3. Expand role constraint to include 'guest'
alter table public.project_members
  drop constraint if exists project_members_role_check;

alter table public.project_members
  add constraint project_members_role_check
  check (role in ('owner', 'admin', 'member', 'viewer', 'guest'));

-- 4. Create a helper RPC so clients can look up a user id by email
--    (profiles.email is now public, but this is a fallback)
create or replace function public.find_user_id_by_email(lookup_email text)
returns uuid language sql security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;

-- Grant execute to authenticated users
grant execute on function public.find_user_id_by_email(text) to authenticated;

-- 5. Fix project_members RLS — both SELECT and INSERT/UPDATE/DELETE.
--    The self-referential EXISTS check caused infinite recursion.
--    Use a SECURITY DEFINER helper that reads project_members bypassing RLS.

create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$;

grant execute on function public.is_project_member(uuid, uuid) to authenticated;

create or replace function public.is_project_admin(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_project_admin(uuid, uuid) to authenticated;

drop policy if exists "Members can view project membership" on public.project_members;
drop policy if exists "Admins can manage project members" on public.project_members;

create policy "Members can view project membership"
  on public.project_members for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Admins can manage project members"
  on public.project_members
  for all
  using  (public.is_project_admin(project_id, auth.uid()))
  with check (public.is_project_admin(project_id, auth.uid()));
