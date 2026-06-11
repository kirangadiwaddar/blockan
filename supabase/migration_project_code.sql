alter table public.projects add column if not exists code text;
update public.projects set code = key || '-' || (floor(random() * 9000 + 1000))::text where code is null;
