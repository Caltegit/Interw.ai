
UPDATE public.user_roles SET role = 'member' WHERE role IN ('recruiter','viewer');

INSERT INTO public.user_roles (user_id, organization_id, role)
SELECT om.user_id, om.organization_id, 'member'::app_role
FROM public.organization_members om
JOIN auth.users u ON u.id = om.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur
  WHERE ur.user_id = om.user_id AND ur.organization_id = om.organization_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur2
  WHERE ur2.user_id = om.user_id AND ur2.role = 'super_admin'
)
AND NOT EXISTS (
  SELECT 1 FROM public.organizations o
  WHERE o.id = om.organization_id AND o.owner_id = om.user_id
);

-- Drop dependent policies before swapping enum
DROP POLICY IF EXISTS "Org members can read report_jobs" ON public.report_jobs;
DROP POLICY IF EXISTS "Super admin can update report_jobs" ON public.report_jobs;

ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'member', 'super_admin');

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role_old) CASCADE;

ALTER TABLE public.user_roles
  ALTER COLUMN role TYPE public.app_role
  USING role::text::public.app_role;

DROP TYPE public.app_role_old;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Recreate the report_jobs policies with the new enum
CREATE POLICY "Org members can read report_jobs"
ON public.report_jobs
FOR SELECT
USING (
  (organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
);

CREATE POLICY "Super admin can update report_jobs"
ON public.report_jobs
FOR UPDATE
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
