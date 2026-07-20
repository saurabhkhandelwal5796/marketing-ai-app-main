create extension if not exists pgcrypto;

create table if not exists public.campaign_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid null,
  campaign_name text not null,
  channel text not null,
  recipients text not null,
  content text not null,
  status text not null default 'sent',
  sent_at timestamptz not null default now(),
  opens integer not null default 0,
  clicks integer not null default 0
);

alter table public.campaign_logs add column if not exists campaign_id uuid null;

create index if not exists campaign_logs_campaign_name_idx on public.campaign_logs (campaign_name);
create index if not exists campaign_logs_campaign_id_idx on public.campaign_logs (campaign_id);
create index if not exists campaign_logs_channel_idx on public.campaign_logs (channel);
create index if not exists campaign_logs_sent_at_idx on public.campaign_logs (sent_at desc);

