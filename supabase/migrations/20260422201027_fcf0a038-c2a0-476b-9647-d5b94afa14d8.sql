ALTER TABLE public.intro_templates
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS tts_voice_id text;

ALTER TABLE public.intro_templates DROP CONSTRAINT IF EXISTS intro_templates_type_check;
ALTER TABLE public.intro_templates
  ADD CONSTRAINT intro_templates_type_check
  CHECK (type IN ('text', 'tts', 'audio', 'video'));