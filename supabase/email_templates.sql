create extension if not exists pgcrypto;

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_templates_created_at_idx on public.email_templates (created_at desc);
create index if not exists email_templates_name_idx on public.email_templates (name);
