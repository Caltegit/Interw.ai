CREATE OR REPLACE FUNCTION public.enqueue_report_job(p_session_id uuid)
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

  INSERT INTO public.report_jobs (session_id, organization_id, status, next_attempt_at)
  VALUES (p_session_id, v_org, 'queued', now())
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
      next_attempt_at = now(),
      updated_at = now();
END $function$;