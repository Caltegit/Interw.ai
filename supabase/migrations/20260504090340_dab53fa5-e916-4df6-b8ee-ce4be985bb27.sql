ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cloned_voice_id text,
  ADD COLUMN IF NOT EXISTS cloned_voice_name text,
  ADD COLUMN IF NOT EXISTS cloned_voice_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS cloned_voice_consent_at timestamptz;