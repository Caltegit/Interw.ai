ALTER TABLE public.question_templates
  ADD COLUMN type text NOT NULL DEFAULT 'written',
  ADD COLUMN audio_url text DEFAULT NULL,
  ADD COLUMN video_url text DEFAULT NULL;