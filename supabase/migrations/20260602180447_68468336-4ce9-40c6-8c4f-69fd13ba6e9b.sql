
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS candidate_fields jsonb NOT NULL DEFAULT jsonb_build_object(
    'job_title',    jsonb_build_object('enabled', false, 'required', false),
    'cv',           jsonb_build_object('enabled', false, 'required', false),
    'linkedin',     jsonb_build_object('enabled', false, 'required', false),
    'cover_letter', jsonb_build_object('enabled', false, 'required', false)
  );

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS candidate_job_title text NULL,
  ADD COLUMN IF NOT EXISTS candidate_cover_letter_url text NULL,
  ADD COLUMN IF NOT EXISTS candidate_cover_letter_filename text NULL;
