ALTER TABLE public.report_jobs
ADD COLUMN IF NOT EXISTS force_regenerate boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enqueue_report_job(p_session_id uuid, p_force boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.report_jobs (session_id, organization_id, status, next_attempt_at, force_regenerate)
  VALUES (p_session_id, v_org, 'queued', now(), COALESCE(p_force, false))
  ON CONFLICT (session_id) DO UPDATE
    SET
      status = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.status
        ELSE 'queued'
      END,
      attempts = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.attempts
        ELSE 0
      END,
      locked_at = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.locked_at
        ELSE NULL
      END,
      locked_until = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.locked_until
        ELSE NULL
      END,
      last_error = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.last_error
        ELSE NULL
      END,
      completed_at = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.completed_at
        ELSE NULL
      END,
      force_regenerate = CASE
        WHEN public.report_jobs.status = 'processing' THEN public.report_jobs.force_regenerate OR COALESCE(p_force, false)
        ELSE COALESCE(p_force, false)
      END,
      next_attempt_at = now(),
      updated_at = now();
END $function$;

GRANT EXECUTE ON FUNCTION public.enqueue_report_job(uuid, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_report_job_done(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.report_jobs SET
    status = 'done',
    completed_at = now(),
    locked_until = NULL,
    last_error = NULL,
    force_regenerate = false,
    updated_at = now()
  WHERE session_id = p_session_id;
END $$;

GRANT EXECUTE ON FUNCTION public.mark_report_job_done(uuid) TO service_role;