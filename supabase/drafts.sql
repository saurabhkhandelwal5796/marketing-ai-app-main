-- Create drafts table
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  type_id text not null,
  type_label text,
  subject text,
  content text,
  image_url text,
  attachments jsonb default '[]'::jsonb,
  to_address text,
  cc_address text,
  bcc_address text,
  email_list jsonb default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  status text not null default 'Draft',
  favorite boolean not null default false
);
