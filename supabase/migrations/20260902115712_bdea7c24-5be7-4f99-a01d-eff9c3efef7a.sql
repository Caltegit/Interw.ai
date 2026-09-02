CREATE OR REPLACE FUNCTION public.my_pending_invitation()
RETURNS TABLE (token text, organization_name text, expired boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.token::text, o.name::text, (i.expires_at <= now()) AS expired
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  WHERE i.status = 'pending'
    AND lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND coalesce(auth.jwt() ->> 'email', '') <> ''
  ORDER BY i.created_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.my_pending_invitation() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_pending_invitation() TO authenticated;