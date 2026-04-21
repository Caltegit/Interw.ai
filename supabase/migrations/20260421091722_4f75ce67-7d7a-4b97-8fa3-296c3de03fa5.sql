ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS last_question_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity_at timestamptz;