-- 1. Add owner_id to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS owner_id uuid;

-- 2. Add organization_id to user_roles (nullable for global roles, set for org-scoped roles)
ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Drop the old unique (user_id, role) if it exists (we now scope by org)
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_user_id_role_key;

-- New unique: a user can have a given role at most once per org (or once globally if org is null)
CREATE UNIQUE INDEX IF NOT EXISTS user_roles_user_role_org_unique
  ON public.user_roles (user_id, role, COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- 3. Backfill: set owner_id from earliest member, and promote them as admins
-- Pick the earliest profile linked to each org as the owner
WITH first_members AS (
  SELECT DISTINCT ON (organization_id)
    organization_id, user_id
  FROM public.profiles
  WHERE organization_id IS NOT NULL
  ORDER BY organization_id, created_at ASC
)
UPDATE public.organizations o
SET owner_id = fm.user_id
FROM first_members fm
WHERE o.id = fm.organization_id
  AND o.owner_id IS NULL;

-- Ensure owner has admin role on their org
INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT o.owner_id, 'admin'::app_role, o.id
FROM public.organizations o
WHERE o.owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Ensure all existing org members have at least the recruiter role on their org
INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT p.user_id, 'recruiter'::app_role, p.organization_id
FROM public.profiles p
WHERE p.organization_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Helper function: is the user an admin of a given org?
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND organization_id = _org_id
  )
$$;

-- 5. Update accept_invitation to insert role with org scope
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
BEGIN
  SELECT id, organization_id INTO _invitation_id, _org_id
  FROM public.organization_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;

  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, 'recruiter', _org_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 6. Update RLS on organizations: only admins can update
DROP POLICY IF EXISTS "Org members can update their organization" ON public.organizations;
CREATE POLICY "Org admins can update their organization"
ON public.organizations
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), id));

-- 7. Update RLS on organization_invitations: only admins can create/delete
DROP POLICY IF EXISTS "Org members can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org members can delete invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org members can update invitations" ON public.organization_invitations;

CREATE POLICY "Org admins can create invitations"
ON public.organization_invitations
FOR INSERT
TO authenticated
WITH CHECK (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete invitations"
ON public.organization_invitations
FOR DELETE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can update invitations"
ON public.organization_invitations
FOR UPDATE
TO authenticated
USING (public.is_org_admin(auth.uid(), organization_id));

-- 8. RLS on user_roles: admins can manage roles in their org (but not the owner)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Org admins can view org roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (organization_id IS NOT NULL AND public.is_org_admin(auth.uid(), organization_id))
);

CREATE POLICY "Org admins can insert org roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
);

CREATE POLICY "Org admins can delete org roles except owner"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_admin(auth.uid(), organization_id)
  AND user_id <> COALESCE(
    (SELECT owner_id FROM public.organizations WHERE id = user_roles.organization_id),
    '00000000-0000-0000-0000-000000000000'::uuid
  )
);

-- 9. Storage policies for org logos in 'media' bucket
-- Path convention: org-logos/{org_id}/filename
DROP POLICY IF EXISTS "Org logos public read" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Org admins can delete logos" ON storage.objects;

CREATE POLICY "Org logos public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media' AND (storage.foldername(name))[1] = 'org-logos');

CREATE POLICY "Org admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Org admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);

CREATE POLICY "Org admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND public.is_org_admin(auth.uid(), ((storage.foldername(name))[2])::uuid)
);