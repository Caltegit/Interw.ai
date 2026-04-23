ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS pricing text,
  ADD COLUMN IF NOT EXISTS client_notes text;