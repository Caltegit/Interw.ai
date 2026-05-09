CREATE TABLE public.session_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL,
  user_agent text NOT NULL DEFAULT '',
  browser text,
  browser_version text,
  os text,
  device_type text,
  is_in_app_webview boolean NOT NULL DEFAULT false,
  webview_host text,
  compat_level text NOT NULL DEFAULT 'ok',
  block_reason text,
  has_get_user_media boolean NOT NULL DEFAULT false,
  has_media_recorder boolean NOT NULL DEFAULT false,
  has_audio_context boolean NOT NULL DEFAULT false,
  screen_w integer,
  screen_h integer,
  viewport_w integer,
  viewport_h integer,
  language text,
  proceeded_anyway boolean NOT NULL DEFAULT false
);

CREATE INDEX idx_session_attempts_session_id ON public.session_attempts(session_id);
CREATE INDEX idx_session_attempts_created_at ON public.session_attempts(created_at DESC);

ALTER TABLE public.session_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert session attempts"
ON public.session_attempts
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Org members and super admins can view session attempts"
ON public.session_attempts
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s
  JOIN projects p ON p.id = s.project_id
  WHERE s.id = session_attempts.session_id
    AND ((p.created_by = auth.uid())
      OR (p.organization_id = get_user_organization_id(auth.uid()))
      OR is_super_admin(auth.uid()))
));

CREATE OR REPLACE FUNCTION public.mark_attempt_proceeded(_attempt_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.session_attempts
  SET proceeded_anyway = true
  WHERE id = _attempt_id;
$$;

GRANT EXECUTE ON FUNCTION public.mark_attempt_proceeded(uuid) TO anon, authenticated;