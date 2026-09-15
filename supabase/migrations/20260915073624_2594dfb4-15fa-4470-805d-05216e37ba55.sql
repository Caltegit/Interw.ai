CREATE TABLE public.media_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('candidate', 'member', 'super_admin', 'internal', 'anonymous')),
  outcome text NOT NULL CHECK (outcome IN ('allowed', 'forbidden', 'not_found', 'signing_failed', 'invalid_request')),
  reason text NOT NULL,
  duration_ms integer NOT NULL DEFAULT 0 CHECK (duration_ms >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);
GRANT SELECT ON public.media_access_logs TO authenticated;
GRANT ALL ON public.media_access_logs TO service_role;
ALTER TABLE public.media_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can read media diagnostics"
ON public.media_access_logs
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));
CREATE INDEX media_access_logs_session_created_idx ON public.media_access_logs(session_id, created_at DESC);
CREATE INDEX media_access_logs_expiry_idx ON public.media_access_logs(expires_at);