-- Create create_post_email_history table
create table if not exists public.create_post_email_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  recipient text not null,
  subject text,
  sent_timestamp timestamptz default now(),
  status text not null,
  sent_via text not null -- 'Browser Gmail', 'Automated Gmail'
);

-- Index for querying
create index if not exists idx_create_post_email_history_user_id on public.create_post_email_history(user_id);
