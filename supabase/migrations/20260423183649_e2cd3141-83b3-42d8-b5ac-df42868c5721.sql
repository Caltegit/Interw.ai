ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS highlight_clips jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS stats jsonb NOT NULL DEFAULT '{}'::jsonb;