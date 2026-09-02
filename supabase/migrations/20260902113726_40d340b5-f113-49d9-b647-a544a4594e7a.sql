REVOKE ALL ON FUNCTION public.create_own_organization(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_own_organization(text) TO authenticated;