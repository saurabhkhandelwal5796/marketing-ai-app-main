-- Create create_post_history table
create table if not exists public.create_post_history (
  id uuid primary key default gen_random_uuid(),
  record_number serial,
  user_id uuid not null references public.users(id) on delete cascade,
  platform text not null,
  content text,
  subject text,
  word_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  status text not null default 'Draft'
);
