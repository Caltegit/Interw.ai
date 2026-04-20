ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'browser',
  ADD COLUMN IF NOT EXISTS tts_voice_id text DEFAULT 'XB0fDUnXU5powFXDhCwa';

ALTER TABLE public.projects
  ADD CONSTRAINT projects_tts_provider_check
  CHECK (tts_provider IN ('browser', 'elevenlabs'));