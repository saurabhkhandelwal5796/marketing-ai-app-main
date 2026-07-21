-- Schema for storing personalized campaign emails in Create & Post module
CREATE TABLE IF NOT EXISTS public.campaign_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  campaign_id TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  company TEXT,
  subject TEXT,
  body TEXT,
  send_status TEXT DEFAULT 'Pending', -- 'Pending', 'Sent', 'Failed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_emails_user_id ON public.campaign_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign_id ON public.campaign_emails(campaign_id);
