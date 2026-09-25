CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON public.reports (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status_demo_created ON public.sessions (status, is_demo, created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_project_status_completed ON public.sessions (project_id, status, completed_at DESC);

CREATE OR REPLACE FUNCTION public.dashboard_recent_projects()
RETURNS TABLE(id uuid, title text, job_title text, created_at timestamptz, session_count bigint, last_completed_at timestamptz)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  WITH done AS (
    SELECT s.project_id, count(*) AS n, max(coalesce(s.completed_at, s.created_at)) AS last_at
    FROM sessions s
    WHERE s.status = 'completed' AND s.is_demo = false
      AND EXISTS (SELECT 1 FROM reports r WHERE r.session_id = s.id)
    GROUP BY s.project_id
  )
  SELECT p.id, p.title, p.job_title, p.created_at, coalesce(d.n,0), d.last_at
  FROM projects p LEFT JOIN done d ON d.project_id = p.id
  WHERE p.status = 'active'
  ORDER BY (d.last_at IS NULL), d.last_at DESC NULLS LAST, p.created_at DESC
  LIMIT 5;
$$;
GRANT EXECUTE ON FUNCTION public.dashboard_recent_projects() TO authenticated;