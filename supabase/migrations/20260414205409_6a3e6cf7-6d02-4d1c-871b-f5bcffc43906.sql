
DROP POLICY IF EXISTS "Org members can view org profiles" ON public.profiles;

CREATE POLICY "Org members can view org profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND organization_id = public.get_user_organization_id(auth.uid())
);
