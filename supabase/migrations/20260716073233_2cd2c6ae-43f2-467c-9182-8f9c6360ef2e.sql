REVOKE ALL ON FUNCTION public.admin_list_impacted_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_impacted_candidates() TO service_role;