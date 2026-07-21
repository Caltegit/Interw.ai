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
  media_counts AS (
    SELECT
      c.id AS sid,
      COALESCE(
        (SELECT count(*) FROM storage.objects obj
         WHERE obj.bucket_id = 'media'
           AND obj.name LIKE 'interviews/' || c.id::text || '/%'
           AND COALESCE((obj.metadata->>'size')::bigint, 0) > 1024),
        0
      ) AS n_real
    FROM candidates c
  ),
  latest_reports AS (
    SELECT DISTINCT ON (r.session_id)
      r.session_id AS sid,
      r.audio_health AS r_audio_health,
      r.executive_summary AS r_executive_summary,
      r.overall_score AS r_overall_score
    FROM public.reports r
    JOIN candidates c ON c.id = r.session_id
    ORDER BY r.session_id, r.generated_at DESC NULLS LAST
  ),
  jobs AS (
    SELECT j.session_id AS sid, j.status::text AS job_status
    FROM public.report_jobs j
    JOIN candidates c ON c.id = j.session_id
  ),
  reinv_agg AS (
    SELECT
      sr.original_session_id AS sid,
      jsonb_agg(
        jsonb_build_object(
          'id', sr.id,
          'sent_at', sr.email_sent_at,
          'email_status', sr.email_status,
          'new_session_id', sr.new_session_id,
          'new_session_status', ns.status,
          'new_completed_at', ns.completed_at,
          'new_audio_health', nr.r_audio_health,
          'new_executive_summary', nr.r_executive_summary,
          'new_job_status', nj.status,
          'new_has_media', COALESCE((
            SELECT count(*) > 0 FROM storage.objects obj
            WHERE obj.bucket_id = 'media'
              AND obj.name LIKE 'interviews/' || sr.new_session_id::text || '/%'
              AND COALESCE((obj.metadata->>'size')::bigint, 0) > 1024
          ), false)
        )
        ORDER BY sr.created_at ASC
      ) AS items
    FROM public.session_reinvitations sr
    LEFT JOIN public.sessions ns ON ns.id = sr.new_session_id
    LEFT JOIN LATERAL (
      SELECT r2.audio_health AS r_audio_health, r2.executive_summary AS r_executive_summary
      FROM public.reports r2
      WHERE r2.session_id = sr.new_session_id
      ORDER BY r2.generated_at DESC NULLS LAST
      LIMIT 1
    ) nr ON true
    LEFT JOIN public.report_jobs nj ON nj.session_id = sr.new_session_id
    WHERE sr.original_session_id IN (SELECT id FROM candidates)
    GROUP BY sr.original_session_id
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
    (mc.n_real > 0) AS has_media,
    lr.r_audio_health,
    lr.r_executive_summary,
    lr.r_overall_score,
    j.job_status,
    COALESCE(ra.items, '[]'::jsonb) AS reinvitations
  FROM candidates c
  LEFT JOIN media_counts mc ON mc.sid = c.id
  LEFT JOIN latest_reports lr ON lr.sid = c.id
  LEFT JOIN jobs j ON j.sid = c.id
  LEFT JOIN reinv_agg ra ON ra.sid = c.id
  ORDER BY c.created_at DESC;
END;
$$;