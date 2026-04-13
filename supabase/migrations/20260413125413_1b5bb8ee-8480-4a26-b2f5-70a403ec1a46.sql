ALTER TABLE public.questions
ADD COLUMN audio_url text DEFAULT NULL,
ADD COLUMN video_url text DEFAULT NULL;