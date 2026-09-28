CREATE OR REPLACE FUNCTION public.list_org_members(_org_id uuid)
RETURNS TABLE(id uuid, user_id uuid, full_name text, email text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.user_id, p.full_name, p.email
  FROM public.organization_members m
  JOIN public.profiles p ON p.user_id = m.user_id
  WHERE m.organization_id = _org_id
    AND (public.is_org_member(auth.uid(), _org_id) OR public.is_super_admin(auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.list_org_members(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_org_members(uuid) TO authenticated;