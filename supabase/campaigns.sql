create extension if not exists pgcrypto;

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Untitled Campaign',
  company text not null default '',
  goal text not null default '',
  website text not null default '',
  attachment_name text not null default '',
  description text not null default '',
  chat_messages jsonb not null default '[]'::jsonb,
  marketing_plan jsonb not null default '[]'::jsonb,
  selected_step_ids jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  selected_actions jsonb not null default '[]'::jsonb,
  outputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create or replace function public.set_campaigns_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_campaigns_updated_at on public.campaigns;
create trigger trg_campaigns_updated_at
before update on public.campaigns
for each row
execute function public.set_campaigns_updated_at();

create index if not exists campaigns_updated_at_idx on public.campaigns (updated_at desc);
create index if not exists campaigns_last_activity_at_idx on public.campaigns (last_activity_at desc);
