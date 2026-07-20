create extension if not exists pgcrypto;

create table if not exists public.milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  campaign_id uuid references public.campaigns(id) on delete set null,
  assignee_id uuid references public.users(id) on delete set null,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed', 'Overdue')),
  start_date date,
  end_date date,
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.milestone_tasks (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones(id) on delete cascade,
  title text not null,
  task_type text not null default 'Generic Task',
  assignee_id uuid references public.users(id) on delete set null,
  status text not null default 'Not Started' check (status in ('Not Started', 'In Progress', 'Completed')),
  created_at timestamptz not null default now()
);

create index if not exists milestones_campaign_id_idx on public.milestones (campaign_id);
create index if not exists milestones_assignee_id_idx on public.milestones (assignee_id);
create index if not exists milestones_status_idx on public.milestones (status);
create index if not exists milestones_end_date_idx on public.milestones (end_date);
create index if not exists milestone_tasks_milestone_id_idx on public.milestone_tasks (milestone_id);
create index if not exists milestone_tasks_assignee_id_idx on public.milestone_tasks (assignee_id);

create or replace function public.update_milestones_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at
before update on public.milestones
for each row
execute function public.update_milestones_updated_at();
