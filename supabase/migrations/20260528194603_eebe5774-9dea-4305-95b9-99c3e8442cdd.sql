ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS audio_health jsonb;
ALTER TABLE public.session_messages ADD COLUMN IF NOT EXISTS audio_quality jsonb;