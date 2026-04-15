create extension if not exists pgcrypto;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null default '',
  body text not null,
  case_studies jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.email_templates add column if not exists subject text not null default '';
alter table public.email_templates add column if not exists case_studies jsonb not null default '[]'::jsonb;

create index if not exists email_templates_created_at_idx on public.email_templates (created_at desc);
create index if not exists email_templates_name_idx on public.email_templates (name);
