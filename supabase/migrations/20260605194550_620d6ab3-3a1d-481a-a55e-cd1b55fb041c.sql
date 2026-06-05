ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS candidate_email_subject text,
  ADD COLUMN IF NOT EXISTS candidate_email_body text;