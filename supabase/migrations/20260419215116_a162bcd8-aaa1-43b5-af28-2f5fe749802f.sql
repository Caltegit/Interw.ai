ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS relance_level text NOT NULL DEFAULT 'medium';