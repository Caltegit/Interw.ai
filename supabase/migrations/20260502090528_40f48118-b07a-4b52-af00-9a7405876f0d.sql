DO $$ BEGIN
  CREATE TYPE public.recruiter_decision_type AS ENUM ('none', 'shortlisted', 'rejected', 'second_opinion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS recruiter_decision public.recruiter_decision_type NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recruiter_decision_at timestamptz,
  ADD COLUMN IF NOT EXISTS recruiter_decision_by uuid;