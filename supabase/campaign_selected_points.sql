create extension if not exists pgcrypto;

create table if not exists public.campaign_selected_points (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  point_id text not null,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists campaign_selected_points_campaign_id_point_id_uq
on public.campaign_selected_points (campaign_id, point_id);

