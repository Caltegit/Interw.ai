ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS nonverbal_analysis jsonb,
  ADD COLUMN IF NOT EXISTS highlights jsonb,
  ADD COLUMN IF NOT EXISTS timeline jsonb,
  ADD COLUMN IF NOT EXISTS reliability jsonb,
  ADD COLUMN IF NOT EXISTS coherence jsonb;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS enable_bias_detection boolean NOT NULL DEFAULT false;