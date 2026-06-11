-- ============================================================
-- Blockan — Database Schema + RLS Policies
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- STEP 1: CREATE ALL TABLES FIRST (no policies yet)
-- ============================================================

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  bio         text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  key         text not null,
  description text,
  color       text default 'bg-blue-500',
  status      text default 'active' check (status in ('active', 'archived', 'paused')),
  owner_id    uuid references public.profiles(id) on delete set null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create table if not exists public.project_members (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  -- owner: project creator, full control
  -- admin: manage members/settings/sprints
  -- member: create & edit issues, comment (default)
  -- viewer: read-only
  -- guest: external collaborator, limited access
  role        text default 'member' check (role in ('owner', 'admin', 'member', 'viewer', 'guest')),
  joined_at   timestamptz default now() not null,
  unique (project_id, user_id)
);

create table if not exists public.sprints (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references public.projects(id) on delete cascade not null,
  name        text not null,
  goal        text,
  status      text default 'planned' check (status in ('planned', 'active', 'completed')),
  start_date  date,
  end_date    date,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create table if not exists public.issues (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid references public.projects(id) on delete cascade not null,
  sprint_id     uuid references public.sprints(id) on delete set null,
  title         text not null,
  description   text,
  status        text default 'Todo' check (status in ('Todo', 'In Progress', 'In Review', 'Completed', 'Cancelled')),
  priority      text default 'Medium' check (priority in ('Critical', 'High', 'Medium', 'Low', 'No Priority')),
  type          text default 'Task' check (type in ('Bug', 'Feature', 'Task', 'Improvement', 'Epic')),
  points        integer default 0,
  assignee_id   uuid references public.profiles(id) on delete set null,
  reporter_id   uuid references public.profiles(id) on delete set null,
  due_date      date,
  code          text,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

create table if not exists public.comments (
  id          uuid primary key default uuid_generate_v4(),
  issue_id    uuid references public.issues(id) on delete cascade not null,
  author_id   uuid references public.profiles(id) on delete cascade not null,
  body        text not null,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

-- ============================================================
-- STEP 2: ENABLE RLS ON ALL TABLES
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.sprints         enable row level security;
alter table public.issues          enable row level security;
alter table public.comments        enable row level security;

-- ============================================================
-- STEP 3: RLS POLICIES (tables all exist now)
-- ============================================================

-- profiles
create policy "Users can view all profiles"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- projects
create policy "Project members can view projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = projects.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create projects"
  on public.projects for insert
  with check (auth.uid() is not null);

create policy "Project owners can update projects"
  on public.projects for update
  using (owner_id = auth.uid());

create policy "Project owners can delete projects"
  on public.projects for delete
  using (owner_id = auth.uid());

-- Helper functions (security definer bypasses RLS to avoid recursion)
create or replace function public.is_project_member(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = p_user_id
  );
$$;

create or replace function public.is_project_admin(p_project_id uuid, p_user_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.project_members
    where project_id = p_project_id
      and user_id = p_user_id
      and role in ('owner', 'admin')
  );
$$;

grant execute on function public.is_project_member(uuid, uuid) to authenticated;
grant execute on function public.is_project_admin(uuid, uuid) to authenticated;

-- project_members
create policy "Members can view project membership"
  on public.project_members for select
  using (public.is_project_member(project_id, auth.uid()));

create policy "Admins can manage project members"
  on public.project_members for all
  using  (public.is_project_admin(project_id, auth.uid()))
  with check (public.is_project_admin(project_id, auth.uid()));

-- sprints
create policy "Project members can view sprints"
  on public.sprints for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = sprints.project_id and user_id = auth.uid()
    )
  );

create policy "Project members can manage sprints"
  on public.sprints for all
  using (
    exists (
      select 1 from public.project_members
      where project_id = sprints.project_id and user_id = auth.uid()
        and role in ('owner', 'admin', 'member')
    )
  );

-- issues
create policy "Project members can view issues"
  on public.issues for select
  using (
    exists (
      select 1 from public.project_members
      where project_id = issues.project_id and user_id = auth.uid()
    )
  );

create policy "Project members can create issues"
  on public.issues for insert
  with check (
    exists (
      select 1 from public.project_members
      where project_id = issues.project_id and user_id = auth.uid()
        and role in ('owner', 'admin', 'member')
    )
  );

create policy "Project members can update issues"
  on public.issues for update
  using (
    exists (
      select 1 from public.project_members
      where project_id = issues.project_id and user_id = auth.uid()
        and role in ('owner', 'admin', 'member')
    )
  );

create policy "Project admins can delete issues"
  on public.issues for delete
  using (
    exists (
      select 1 from public.project_members
      where project_id = issues.project_id and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- comments
create policy "Project members can view comments"
  on public.comments for select
  using (
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = comments.issue_id and pm.user_id = auth.uid()
    )
  );

create policy "Project members can create comments"
  on public.comments for insert
  with check (
    auth.uid() = author_id and
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = comments.issue_id and pm.user_id = auth.uid()
        and pm.role in ('owner', 'admin', 'member')
    )
  );

create policy "Authors can update their own comments"
  on public.comments for update
  using (author_id = auth.uid());

create policy "Authors and admins can delete comments"
  on public.comments for delete
  using (
    author_id = auth.uid() or
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = comments.issue_id and pm.user_id = auth.uid()
        and pm.role in ('owner', 'admin')
    )
  );

-- ============================================================
-- STEP 4: updated_at TRIGGER
-- ============================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at   before update on public.profiles   for each row execute procedure public.set_updated_at();
create trigger set_projects_updated_at   before update on public.projects   for each row execute procedure public.set_updated_at();
create trigger set_sprints_updated_at    before update on public.sprints    for each row execute procedure public.set_updated_at();
create trigger set_issues_updated_at     before update on public.issues     for each row execute procedure public.set_updated_at();
create trigger set_comments_updated_at   before update on public.comments   for each row execute procedure public.set_updated_at();

-- ============================================================
-- STEP 5: AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STEP 6: ENABLE REALTIME
-- ============================================================

alter publication supabase_realtime add table public.issues;
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.sprints;
