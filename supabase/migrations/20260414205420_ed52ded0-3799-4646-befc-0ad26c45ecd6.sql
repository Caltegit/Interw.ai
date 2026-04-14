
DROP POLICY IF EXISTS "Org members can view invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org members can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org members can update invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org members can delete invitations" ON public.organization_invitations;

CREATE POLICY "Org members can view invitations" ON public.organization_invitations
FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create invitations" ON public.organization_invitations
FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update invitations" ON public.organization_invitations
FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete invitations" ON public.organization_invitations
FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Fix organizations update policy too
DROP POLICY IF EXISTS "Org members can update their organization" ON public.organizations;
CREATE POLICY "Org members can update their organization" ON public.organizations
FOR UPDATE TO authenticated
USING (id = public.get_user_organization_id(auth.uid()));
