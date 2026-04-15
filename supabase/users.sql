create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  company text,
  name text not null,
  email text not null unique,
  role text not null default 'User',
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  avatar text,
  password text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.users add column if not exists password text;
alter table public.users add column if not exists is_admin boolean not null default false;
alter table public.users add column if not exists first_name text;
alter table public.users add column if not exists last_name text;
alter table public.users add column if not exists company text;
alter table public.users add column if not exists role text not null default 'User';
alter table public.users add column if not exists status text not null default 'Active';
alter table public.users add column if not exists linkedin_access_token text;
alter table public.users add column if not exists linkedin_refresh_token text;
alter table public.users add column if not exists linkedin_token_expires_at timestamptz;
alter table public.users add column if not exists linkedin_member_urn text;
alter table public.users alter column email set not null;

create unique index if not exists users_email_unique_idx on public.users (lower(email));
