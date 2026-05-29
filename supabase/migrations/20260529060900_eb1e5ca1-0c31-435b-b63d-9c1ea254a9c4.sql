ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sessions_is_demo ON public.sessions(is_demo) WHERE is_demo = true;