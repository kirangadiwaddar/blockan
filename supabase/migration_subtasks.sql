-- Migration: add parent_id to issues for sub-task support
-- Run in: Supabase Dashboard → SQL Editor → New Query

alter table public.issues
  add column if not exists parent_id uuid references public.issues(id) on delete cascade;

create index if not exists issues_parent_id_idx on public.issues(parent_id);
