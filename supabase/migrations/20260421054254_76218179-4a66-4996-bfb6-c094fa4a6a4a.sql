ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS tts_voice_gender text NOT NULL DEFAULT 'female';

ALTER TABLE public.projects 
ADD CONSTRAINT projects_tts_voice_gender_check 
CHECK (tts_voice_gender IN ('female', 'male'));