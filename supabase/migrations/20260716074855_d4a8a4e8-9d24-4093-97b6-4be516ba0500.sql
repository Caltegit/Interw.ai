CREATE INDEX IF NOT EXISTS idx_session_messages_role_session_id
  ON public.session_messages (role, session_id);

CREATE INDEX IF NOT EXISTS idx_sessions_created_is_demo
  ON public.sessions (created_at, is_demo);

CREATE OR REPLACE FUNCTION public.admin_list_impacted_candidates()
RETURNS TABLE(
  session_id uuid,
  created_at timestamptz,
  candidate_name text,
  candidate_email text,
  project_id uuid,
  project_title text,
  organization_name text,
  session_status text,
  reinvitation_id uuid,
  reinvitation_sent_at timestamptz,
  reinvitation_status text,
  new_session_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  WITH candidate_sessions AS (
    SELECT
      s.id,
      s.created_at,
      s.candidate_name,
      s.candidate_email,
      s.project_id,
      s.organization_id,
      s.status
    FROM public.sessions s
    WHERE s.created_at >= '2026-07-08 00:00:00+00'
      AND s.created_at <  '2026-07-16 00:00:00+00'
      AND COALESCE(s.is_demo, false) = false
      AND public.has_role(auth.uid(), 'super_admin')
      AND EXISTS (
        SELECT 1
        FROM public.session_messages m
        WHERE m.session_id = s.id
          AND m.role = 'candidate'
      )
      AND NOT EXISTS (
        SELECT 1
        FROM storage.objects obj
        WHERE obj.bucket_id = 'media'
          AND obj.name >= ('interviews/' || s.id::text || '/')
          AND obj.name <  ('interviews/' || s.id::text || '0')
          AND ((obj.metadata->>'size')::bigint) > 1024
      )
  )
  SELECT
    cs.id AS session_id,
    cs.created_at,
    cs.candidate_name,
    cs.candidate_email,
    cs.project_id,
    p.title AS project_title,
    o.name AS organization_name,
    cs.status::text AS session_status,
    r.id AS reinvitation_id,
    r.email_sent_at AS reinvitation_sent_at,
    r.email_status AS reinvitation_status,
    r.new_session_id
  FROM candidate_sessions cs
  JOIN public.projects p ON p.id = cs.project_id
  JOIN public.organizations o ON o.id = cs.organization_id
  LEFT JOIN LATERAL (
    SELECT id, email_sent_at, email_status, new_session_id
    FROM public.session_reinvitations
    WHERE original_session_id = cs.id
    ORDER BY created_at DESC
    LIMIT 1
  ) r ON true
  ORDER BY cs.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_impacted_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO service_role;