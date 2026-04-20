-- Audit trail storage for marketing-ai-app
-- Run in Supabase SQL editor or via migration tool.

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete set null,
  event_type text not null,
  page_name text not null default '',
  action_name text,
  details text,
  time_spent_ms integer,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_id_idx on public.audit_logs (user_id);
create index if not exists audit_logs_event_type_idx on public.audit_logs (event_type);
create index if not exists audit_logs_page_name_idx on public.audit_logs (page_name);
create index if not exists audit_logs_session_id_idx on public.audit_logs (session_id);
