REVOKE EXECUTE ON FUNCTION public.admin_list_recoverable_candidates(timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.admin_list_recoverable_candidates(timestamptz) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_list_recoverable_candidates(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_recoverable_candidates(timestamptz) TO service_role;