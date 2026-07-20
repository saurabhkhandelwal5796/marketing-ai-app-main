alter table public.campaigns
add column if not exists ai_state jsonb not null default '{"objective":"","missingInfo":[],"confirmedChoices":[]}'::jsonb;

alter table public.campaigns
add column if not exists response_depth text not null default 'deep';

create table if not exists public.campaign_ai_turns (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  interaction jsonb not null default '{}'::jsonb,
  selected_option text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists campaign_ai_turns_campaign_created_idx
on public.campaign_ai_turns (campaign_id, created_at asc);
