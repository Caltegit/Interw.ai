
-- 1. Réattribuer les projets démo existants au bon owner d'organisation
UPDATE public.projects p
SET created_by = COALESCE(
  o.owner_id,
  (SELECT ur.user_id FROM public.user_roles ur
   WHERE ur.organization_id = p.organization_id AND ur.role = 'admin'::app_role
   ORDER BY ur.id LIMIT 1),
  p.created_by
)
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.title = 'Candidature spontanée - TEST -'
  AND p.created_by IN (
    SELECT user_id FROM public.user_roles WHERE role = 'super_admin'::app_role
  );

-- 2. Mettre à jour accept_invitation pour seed le projet démo quand un owner rejoint
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
  _invitation_status invitation_status;
  _current_owner uuid;
  _current_org_in_profile uuid;
  _assigned_role app_role;
  _has_any_role boolean;
  _became_owner boolean := false;
BEGIN
  SELECT id, organization_id, status
    INTO _invitation_id, _org_id, _invitation_status
  FROM public.organization_invitations
  WHERE token = _token AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF _invitation_status <> 'accepted'::invitation_status THEN
    UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;
  END IF;

  SELECT organization_id INTO _current_org_in_profile
  FROM public.profiles WHERE user_id = _user_id;

  IF _current_org_in_profile IS NULL OR _current_org_in_profile <> _org_id THEN
    UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;
  END IF;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _assigned_role := 'admin'::app_role;
    _became_owner := true;
  ELSIF _current_owner = _user_id THEN
    _assigned_role := 'admin'::app_role;
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  ) INTO _has_any_role;

  IF NOT _has_any_role THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (_user_id, _assigned_role, _org_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Créer le projet démo si le user devient owner
  IF _became_owner THEN
    PERFORM public.seed_demo_project(_org_id, _user_id);
  END IF;
END;
$function$;

-- 3. Élargir les RLS — projects
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

CREATE POLICY "Org members can view org projects v2"
ON public.projects FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org members can update org projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org members can delete org projects"
ON public.projects FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- 4. Élargir les RLS — questions
DROP POLICY IF EXISTS "Users can view own project questions" ON public.questions;
DROP POLICY IF EXISTS "Users can manage own project questions" ON public.questions;

CREATE POLICY "Org members can view org questions"
ON public.questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can insert org questions"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can update org questions"
ON public.questions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can delete org questions"
ON public.questions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

-- 5. Élargir les RLS — evaluation_criteria
DROP POLICY IF EXISTS "Users can view own project criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Users can manage own project criteria" ON public.evaluation_criteria;

CREATE POLICY "Org members can view org criteria"
ON public.evaluation_criteria FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can insert org criteria"
ON public.evaluation_criteria FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can update org criteria"
ON public.evaluation_criteria FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));

CREATE POLICY "Org members can delete org criteria"
ON public.evaluation_criteria FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
));
