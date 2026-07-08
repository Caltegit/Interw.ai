REVOKE ALL ON public.password_reset_codes FROM PUBLIC;
REVOKE ALL ON public.password_reset_codes FROM anon;
REVOKE ALL ON public.password_reset_codes FROM authenticated;
GRANT ALL ON public.password_reset_codes TO service_role;