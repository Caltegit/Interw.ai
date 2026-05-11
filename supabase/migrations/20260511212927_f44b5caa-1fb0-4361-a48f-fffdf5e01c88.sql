ALTER TABLE public.projects ALTER COLUMN audio_analysis_enabled SET DEFAULT true;
UPDATE public.projects SET audio_analysis_enabled = true WHERE audio_analysis_enabled = false;