-- Create table for storing imported contacts in Create & Post module
CREATE TABLE IF NOT EXISTS public.create_post_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT,
  email TEXT NOT NULL,
  company TEXT,
  status TEXT DEFAULT 'valid',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_create_post_contacts_user_id ON public.create_post_contacts(user_id);
