CREATE OR REPLACE FUNCTION public.enqueue_report_job(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.enqueue_report_job(p_session_id, false);
END $function$;

GRANT EXECUTE ON FUNCTION public.enqueue_report_job(uuid) TO authenticated, service_role;