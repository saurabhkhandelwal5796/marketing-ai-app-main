-- Migration: Add email workspace fields to drafts table
-- Run this in Supabase SQL Editor if the table already exists

ALTER TABLE public.drafts
  ADD COLUMN IF NOT EXISTS to_address text,
  ADD COLUMN IF NOT EXISTS cc_address text,
  ADD COLUMN IF NOT EXISTS bcc_address text,
  ADD COLUMN IF NOT EXISTS email_list jsonb DEFAULT '[]'::jsonb;
