ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS report_recipient_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];