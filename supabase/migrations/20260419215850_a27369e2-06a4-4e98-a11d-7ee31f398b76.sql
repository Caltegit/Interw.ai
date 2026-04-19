ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS relance_level text NOT NULL DEFAULT 'medium';
ALTER TABLE public.question_templates ADD COLUMN IF NOT EXISTS relance_level text NOT NULL DEFAULT 'medium';
ALTER TABLE public.projects DROP COLUMN IF EXISTS relance_level;