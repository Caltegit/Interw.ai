CREATE OR REPLACE FUNCTION public.admin_list_recoverable_candidates(
  p_since timestamptz DEFAULT '2026-07-20 00:00:00+00'::timestamptz
)
RETURNS TABLE (
  session_id uuid,
  created_at timestamptz,
  completed_at timestamptz,
  candidate_name text,
  candidate_email text,
  project_id uuid,
  project_title text,
  organization_id uuid,
  organization_name text,
  session_status text,
  has_media boolean,
  audio_health jsonb,
  executive_summary text,
  overall_score numeric,
  report_job_status text,
  reinvitations jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH candidates AS (
    SELECT
      s.id,
      s.created_at,
      s.completed_at,
      s.candidate_name,
      s.candidate_email,
      s.project_id,
      p.title AS project_title,
      p.organization_id,
      o.name AS organization_name,
      s.status::text AS session_status
    FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    LEFT JOIN public.organizations o ON o.id = p.organization_id
    WHERE s.is_demo = false
      AND s.created_at >= p_since
      AND s.status::text IN ('completed', 'cancelled')
      AND s.status::text <> 'cancelled_partial'
      AND NOT EXISTS (
        SELECT 1 FROM public.session_reinvitations sr
        WHERE sr.new_session_id = s.id
      )
  ),
  reinv_raw AS (
    SELECT sr.*, ns.status AS ns_status, ns.completed_at AS ns_completed_at
    FROM public.session_reinvitations sr
    LEFT JOIN public.sessions ns ON ns.id = sr.new_session_id
    WHERE sr.original_session_id IN (SELECT id FROM candidates)
  ),
  all_sids AS (
    SELECT id AS sid FROM candidates
    UNION
    SELECT new_session_id FROM reinv_raw WHERE new_session_id IS NOT NULL
  ),
  -- Une seule passe sur storage.objects, filtrée sur les session_ids concernés
  media AS (
    SELECT
      (split_part(obj.name, '/', 2))::uuid AS sid,
      count(*) FILTER (WHERE COALESCE((obj.metadata->>'size')::bigint, 0) > 1024) AS n_real
    FROM storage.objects obj
    WHERE obj.bucket_id = 'media'
      AND obj.name LIKE 'interviews/%'
      AND (split_part(obj.name, '/', 2))::uuid IN (SELECT sid FROM all_sids)
    GROUP BY 1
  ),
  latest_reports AS (
    SELECT DISTINCT ON (r.session_id)
      r.session_id AS sid,
      r.audio_health AS r_audio_health,
      r.executive_summary AS r_executive_summary,
      r.overall_score AS r_overall_score
    FROM public.reports r
    WHERE r.session_id IN (SELECT sid FROM all_sids)
    ORDER BY r.session_id, r.generated_at DESC NULLS LAST
  ),
  jobs AS (
    SELECT DISTINCT ON (j.session_id)
      j.session_id AS sid,
      j.status::text AS job_status
    FROM public.report_jobs j
    WHERE j.session_id IN (SELECT sid FROM all_sids)
    ORDER BY j.session_id, j.created_at DESC NULLS LAST
  ),
  reinv_agg AS (
    SELECT
      rr.original_session_id AS sid,
      jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'sent_at', rr.email_sent_at,
          'email_status', rr.email_status,
          'new_session_id', rr.new_session_id,
          'new_session_status', rr.ns_status,
          'new_completed_at', rr.ns_completed_at,
          'new_audio_health', nlr.r_audio_health,
          'new_executive_summary', nlr.r_executive_summary,
          'new_job_status', nj.job_status,
          'new_has_media', COALESCE(nm.n_real, 0) > 0
        )
        ORDER BY rr.created_at ASC
      ) AS items
    FROM reinv_raw rr
    LEFT JOIN latest_reports nlr ON nlr.sid = rr.new_session_id
    LEFT JOIN jobs nj ON nj.sid = rr.new_session_id
    LEFT JOIN media nm ON nm.sid = rr.new_session_id
    GROUP BY rr.original_session_id
  )
  SELECT
    c.id,
    c.created_at,
    c.completed_at,
    c.candidate_name,
    c.candidate_email,
    c.project_id,
    c.project_title,
    c.organization_id,
    c.organization_name,
    c.session_status,
    (COALESCE(m.n_real, 0) > 0) AS has_media,
    lr.r_audio_health,
    lr.r_executive_summary,
    lr.r_overall_score,
    j.job_status,
    COALESCE(ra.items, '[]'::jsonb) AS reinvitations
  FROM candidates c
  LEFT JOIN media m ON m.sid = c.id
  LEFT JOIN latest_reports lr ON lr.sid = c.id
  LEFT JOIN jobs j ON j.sid = c.id
  LEFT JOIN reinv_agg ra ON ra.sid = c.id
  ORDER BY c.created_at DESC;
END;
$$;