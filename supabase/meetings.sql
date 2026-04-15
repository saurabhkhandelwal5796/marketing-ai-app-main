create extension if not exists pgcrypto;

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_by uuid not null references public.users(id) on delete cascade,
  attendees uuid[] not null default '{}',
  external_attendees text[] not null default '{}',
  meeting_type text not null default 'Online' check (meeting_type in ('Online', 'Offline')),
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_time_check check (end_time > start_time)
);

alter table public.meetings add column if not exists updated_at timestamptz not null default now();
alter table public.meetings add column if not exists external_attendees text[] not null default '{}';

create index if not exists meetings_start_time_idx on public.meetings (start_time);
create index if not exists meetings_created_by_idx on public.meetings (created_by);
create index if not exists meetings_attendees_gin_idx on public.meetings using gin (attendees);

create or replace function public.update_meetings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists meetings_set_updated_at on public.meetings;
create trigger meetings_set_updated_at
before update on public.meetings
for each row
execute function public.update_meetings_updated_at();
