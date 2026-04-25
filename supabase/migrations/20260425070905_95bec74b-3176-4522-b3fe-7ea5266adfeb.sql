ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS executive_summary_short text,
  ADD COLUMN IF NOT EXISTS personality_profile jsonb,
  ADD COLUMN IF NOT EXISTS soft_skills jsonb,
  ADD COLUMN IF NOT EXISTS red_flags jsonb,
  ADD COLUMN IF NOT EXISTS motivation_scores jsonb,
  ADD COLUMN IF NOT EXISTS followup_questions jsonb;