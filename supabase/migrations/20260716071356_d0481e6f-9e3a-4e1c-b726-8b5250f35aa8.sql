CREATE OR REPLACE FUNCTION public.admin_list_impacted_candidates()
RETURNS TABLE (
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
  WITH real_files AS (
    SELECT (regexp_match(o.name, '^interviews/([0-9a-f-]{36})'))[1]::uuid AS sid,
           COUNT(*) AS n_real
    FROM storage.objects o
    WHERE o.bucket_id = 'media'
      AND o.name LIKE 'interviews/%'
      AND ((o.metadata->>'size')::bigint) > 1024
    GROUP BY 1
  ),
  cand_msgs AS (
    SELECT m.session_id, COUNT(*) AS n
    FROM public.session_messages m
    WHERE m.role = 'candidate'
    GROUP BY m.session_id
  )
  SELECT
    s.id AS session_id,
    s.created_at,
    s.candidate_name,
    s.candidate_email,
    s.project_id,
    p.title AS project_title,
    o.name AS organization_name,
    s.status::text AS session_status,
    r.id AS reinvitation_id,
    r.email_sent_at AS reinvitation_sent_at,
    r.email_status AS reinvitation_status,
    r.new_session_id
  FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  JOIN public.organizations o ON o.id = s.organization_id
  JOIN cand_msgs cm ON cm.session_id = s.id
  LEFT JOIN real_files rf ON rf.sid = s.id
  LEFT JOIN LATERAL (
    SELECT id, email_sent_at, email_status, new_session_id
    FROM public.session_reinvitations
    WHERE original_session_id = s.id
    ORDER BY created_at DESC
    LIMIT 1
  ) r ON true
  WHERE s.created_at >= '2026-07-08 00:00:00+00'
    AND s.created_at <  '2026-07-16 00:00:00+00'
    AND COALESCE(rf.n_real, 0) = 0
    AND cm.n > 0
    AND s.is_demo = false
    AND public.has_role(auth.uid(), 'super_admin')
  ORDER BY s.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_list_impacted_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO authenticated;