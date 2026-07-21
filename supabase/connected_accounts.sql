-- Create connected_accounts table
create table if not exists public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  provider text not null,
  connected boolean not null default true,
  connected_at timestamptz not null default now(),
  email_address text,
  display_name text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  provider_user_id text,
  unique (user_id, provider)
);
