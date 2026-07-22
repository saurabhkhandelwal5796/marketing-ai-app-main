-- Create create_post_history table
create table if not exists public.create_post_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text,
  platform text not null,
  subject text,
  content text,
  status text not null default 'Draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  recipient text,
  recipient_name text,
  company text,
  sent_via text
);

-- Ensure all required columns exist for backward compatibility / table updates
alter table public.create_post_history add column if not exists type text;
alter table public.create_post_history add column if not exists platform text;
alter table public.create_post_history add column if not exists subject text;
alter table public.create_post_history add column if not exists content text;
alter table public.create_post_history add column if not exists status text;
alter table public.create_post_history add column if not exists created_at timestamptz;
alter table public.create_post_history add column if not exists updated_at timestamptz;
alter table public.create_post_history add column if not exists recipient text;
alter table public.create_post_history add column if not exists recipient_name text;
alter table public.create_post_history add column if not exists company text;
alter table public.create_post_history add column if not exists sent_via text;

-- Add index on user_id if not exists
create index if not exists idx_create_post_history_user_id on public.create_post_history(user_id);
