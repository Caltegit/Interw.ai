
CREATE OR REPLACE FUNCTION public.admin_search_sessions(
  p_search text DEFAULT NULL,
  p_session_statuses text[] DEFAULT NULL,
  p_job_statuses text[] DEFAULT NULL,
  p_email_statuses text[] DEFAULT NULL,
  p_org_id uuid DEFAULT NULL,
  p_exclude_demo boolean DEFAULT true,
  p_anomalies_only boolean DEFAULT false,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  session_id uuid,
  session_token text,
  candidate_name text,
  candidate_email text,
  session_status text,
  is_demo boolean,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz,
  project_id uuid,
  project_title text,
  organization_id uuid,
  organization_name text,
  segments_total int,
  segments_done int,
  report_id uuid,
  report_overall_score numeric,
  report_generated_at timestamptz,
  job_status text,
  job_attempts int,
  job_max_attempts int,
  job_next_attempt_at timestamptz,
  job_locked_until timestamptz,
  job_last_error text,
  job_updated_at timestamptz,
  email_status text,
  email_created_at timestamptz,
  email_error text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      s.id, s.token, s.candidate_name, s.candidate_email, s.status::text AS sess_status,
      s.is_demo, s.started_at, s.completed_at, s.created_at,
      p.id AS p_id, p.title AS p_title,
      o.id AS o_id, o.name AS o_name
    FROM sessions s
    JOIN projects p ON p.id = s.project_id
    JOIN organizations o ON o.id = s.organization_id
    WHERE (NOT p_exclude_demo OR s.is_demo = false)
      AND (p_org_id IS NULL OR s.organization_id = p_org_id)
      AND (p_session_statuses IS NULL OR s.status::text = ANY(p_session_statuses))
      AND (
        p_search IS NULL OR p_search = '' OR
        s.candidate_name ILIKE '%'||p_search||'%' OR
        s.candidate_email ILIKE '%'||p_search||'%' OR
        p.title ILIKE '%'||p_search||'%' OR
        o.name ILIKE '%'||p_search||'%' OR
        s.id::text = p_search OR
        s.token = p_search
      )
  ),
  enriched AS (
    SELECT
      b.id, b.token, b.candidate_name, b.candidate_email, b.sess_status, b.is_demo,
      b.started_at, b.completed_at, b.created_at, b.p_id, b.p_title, b.o_id, b.o_name,
      (SELECT count(*) FROM session_messages sm WHERE sm.session_id = b.id AND sm.role = 'candidate')::int AS seg_total,
      (SELECT count(*) FROM session_messages sm WHERE sm.session_id = b.id AND sm.role = 'candidate' AND sm.transcription_status = 'done')::int AS seg_done,
      r.id AS r_id, r.overall_score AS r_score, r.generated_at AS r_at,
      rj.status::text AS j_status, rj.attempts AS j_attempts, rj.max_attempts AS j_max,
      rj.next_attempt_at AS j_next, rj.locked_until AS j_locked, rj.last_error AS j_err, rj.updated_at AS j_upd,
      el.status AS e_status, el.created_at AS e_created, el.error_message AS e_err
    FROM base b
    LEFT JOIN reports r ON r.session_id = b.id
    LEFT JOIN report_jobs rj ON rj.session_id = b.id
    LEFT JOIN LATERAL (
      SELECT DISTINCT ON (message_id) status, created_at, error_message
      FROM email_send_log
      WHERE template_name = 'candidate-thank-you' AND recipient_email = b.candidate_email
      ORDER BY message_id, created_at DESC
      LIMIT 1
    ) el ON true
  ),
  filtered AS (
    SELECT * FROM enriched
    WHERE (p_job_statuses IS NULL OR COALESCE(j_status, 'none') = ANY(p_job_statuses))
      AND (p_email_statuses IS NULL OR COALESCE(e_status, 'none') = ANY(p_email_statuses))
      AND (NOT p_anomalies_only OR (
        (sess_status = 'completed' AND r_id IS NULL)
        OR j_status = 'failed'
        OR (j_attempts IS NOT NULL AND j_attempts >= 3)
        OR e_status IN ('failed','dlq','bounced')
      ))
  ),
  counted AS (
    SELECT count(*) AS cnt FROM filtered
  )
  SELECT
    f.id, f.token, f.candidate_name, f.candidate_email, f.sess_status,
    f.is_demo, f.started_at, f.completed_at, f.created_at,
    f.p_id, f.p_title, f.o_id, f.o_name,
    f.seg_total, f.seg_done,
    f.r_id, f.r_score, f.r_at,
    f.j_status, f.j_attempts, f.j_max, f.j_next, f.j_locked, f.j_err, f.j_upd,
    f.e_status, f.e_created, f.e_err,
    c.cnt
  FROM filtered f, counted c
  ORDER BY f.completed_at DESC NULLS LAST, f.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_search_sessions(text, text[], text[], text[], uuid, boolean, boolean, int, int) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_sessions_queue_stats(p_window interval DEFAULT '24 hours')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_sessions', (SELECT count(*) FROM sessions WHERE created_at > now() - p_window AND is_demo = false),
    'completed_sessions', (SELECT count(*) FROM sessions WHERE completed_at > now() - p_window AND is_demo = false),
    'reports_generated', (SELECT count(*) FROM reports r JOIN sessions s ON s.id = r.session_id WHERE r.generated_at > now() - p_window AND s.is_demo = false),
    'jobs_failed', (SELECT count(*) FROM report_jobs WHERE status = 'failed' AND updated_at > now() - p_window),
    'jobs_queued', (SELECT count(*) FROM report_jobs WHERE status IN ('queued','processing')),
    'emails_failed', (
      SELECT count(*) FROM (
        SELECT DISTINCT ON (message_id) status, created_at
        FROM email_send_log
        WHERE template_name = 'candidate-thank-you'
        ORDER BY message_id, created_at DESC
      ) l WHERE l.status IN ('failed','dlq','bounced') AND l.created_at > now() - p_window
    )
  ) INTO result;
  RETURN result;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_sessions_queue_stats(interval) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_force_report_job(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO report_jobs (session_id, status, attempts, next_attempt_at, locked_at, locked_until, last_error, organization_id)
  SELECT p_session_id, 'queued'::report_job_status, 0, now(), NULL, NULL, NULL, s.organization_id
  FROM sessions s WHERE s.id = p_session_id
  ON CONFLICT (session_id) DO UPDATE
  SET status = 'queued'::report_job_status,
      attempts = 0,
      next_attempt_at = now(),
      locked_at = NULL,
      locked_until = NULL,
      last_error = NULL,
      updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.admin_force_report_job(uuid) TO authenticated;


CREATE OR REPLACE FUNCTION public.admin_cancel_report_job(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE report_jobs SET status = 'cancelled'::report_job_status, updated_at = now()
  WHERE session_id = p_session_id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_cancel_report_job(uuid) TO authenticated;
