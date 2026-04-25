
ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS consent_accepted_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS cancelled_at timestamp with time zone;

ALTER TYPE public.session_status ADD VALUE IF NOT EXISTS 'cancelled';
