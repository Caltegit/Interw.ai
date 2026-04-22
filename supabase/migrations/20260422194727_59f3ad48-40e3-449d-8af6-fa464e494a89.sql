ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS intro_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intro_mode text,
  ADD COLUMN IF NOT EXISTS intro_text text;

ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_intro_mode_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_intro_mode_check
  CHECK (intro_mode IS NULL OR intro_mode IN ('text', 'tts', 'audio', 'video'));