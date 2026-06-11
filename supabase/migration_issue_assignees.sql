-- Create issue_assignees junction table for multi-assignee support
create table if not exists public.issue_assignees (
  issue_id   uuid not null references public.issues(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (issue_id, user_id)
);

-- Backfill: copy existing single assignees into the new table
insert into public.issue_assignees (issue_id, user_id)
select id, assignee_id
from public.issues
where assignee_id is not null
on conflict do nothing;

-- RLS
alter table public.issue_assignees enable row level security;

drop policy if exists "issue_assignees: project members can read"   on public.issue_assignees;
drop policy if exists "issue_assignees: project members can insert"  on public.issue_assignees;
drop policy if exists "issue_assignees: project members can delete"  on public.issue_assignees;

create policy "issue_assignees: project members can read"
  on public.issue_assignees for select
  using (
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = issue_assignees.issue_id
        and pm.user_id = auth.uid()
    )
  );

create policy "issue_assignees: project members can insert"
  on public.issue_assignees for insert
  with check (
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = issue_assignees.issue_id
        and pm.user_id = auth.uid()
    )
  );

create policy "issue_assignees: project members can delete"
  on public.issue_assignees for delete
  using (
    exists (
      select 1 from public.issues i
      join public.project_members pm on pm.project_id = i.project_id
      where i.id = issue_assignees.issue_id
        and pm.user_id = auth.uid()
    )
  );
