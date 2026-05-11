
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS paraverbal_analysis jsonb;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS audio_analysis_enabled boolean NOT NULL DEFAULT false;
