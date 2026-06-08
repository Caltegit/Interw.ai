
CREATE TABLE public.project_page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  referrer_host text,
  visitor_hash text NOT NULL,
  view_date date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date
);

CREATE INDEX idx_ppv_project_date ON public.project_page_views (project_id, viewed_at DESC);
CREATE UNIQUE INDEX uq_ppv_dedupe ON public.project_page_views (project_id, visitor_hash, view_date);

GRANT SELECT ON public.project_page_views TO authenticated;
GRANT ALL ON public.project_page_views TO service_role;

ALTER TABLE public.project_page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can read their project views"
ON public.project_page_views
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_page_views.project_id
      AND (
        public.is_super_admin(auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = p.organization_id
            AND om.user_id = auth.uid()
        )
      )
  )
);

CREATE OR REPLACE FUNCTION public.get_project_stats_timeseries(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  day date,
  clicks bigint,
  forms bigint,
  started bigint,
  completed bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.projects WHERE id = p_project_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  IF NOT (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_org AND om.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(p_from::date, p_to::date, interval '1 day')::date AS day
  ),
  c AS (
    SELECT view_date AS day, count(*) AS n
    FROM public.project_page_views
    WHERE project_id = p_project_id AND viewed_at >= p_from AND viewed_at < p_to
    GROUP BY view_date
  ),
  s AS (
    SELECT
      (created_at AT TIME ZONE 'utc')::date AS d_created,
      started_at, completed_at, status
    FROM public.sessions
    WHERE project_id = p_project_id
      AND created_at >= p_from AND created_at < p_to
  ),
  f AS (
    SELECT d_created AS day, count(*) AS n FROM s GROUP BY d_created
  ),
  st AS (
    SELECT (started_at AT TIME ZONE 'utc')::date AS day, count(*) AS n
    FROM public.sessions
    WHERE project_id = p_project_id
      AND started_at IS NOT NULL
      AND started_at >= p_from AND started_at < p_to
    GROUP BY (started_at AT TIME ZONE 'utc')::date
  ),
  cp AS (
    SELECT (completed_at AT TIME ZONE 'utc')::date AS day, count(*) AS n
    FROM public.sessions
    WHERE project_id = p_project_id
      AND completed_at IS NOT NULL
      AND completed_at >= p_from AND completed_at < p_to
    GROUP BY (completed_at AT TIME ZONE 'utc')::date
  )
  SELECT
    d.day,
    COALESCE(c.n, 0),
    COALESCE(f.n, 0),
    COALESCE(st.n, 0),
    COALESCE(cp.n, 0)
  FROM days d
  LEFT JOIN c ON c.day = d.day
  LEFT JOIN f ON f.day = d.day
  LEFT JOIN st ON st.day = d.day
  LEFT JOIN cp ON cp.day = d.day
  ORDER BY d.day;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_project_stats_timeseries(uuid, timestamptz, timestamptz) TO authenticated;
