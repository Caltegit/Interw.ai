
-- 1. Fonction d'appartenance d'organisation (SECURITY DEFINER, basée sur organization_members)
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- 2. projects : SELECT / UPDATE / DELETE basés sur l'appartenance d'organisation
DROP POLICY IF EXISTS "Org members can view org projects v2" ON public.projects;
DROP POLICY IF EXISTS "Org members can update org projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can delete org projects" ON public.projects;

CREATE POLICY "Org members can view org projects v2"
ON public.projects FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_member(auth.uid(), organization_id)
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org members can update org projects"
ON public.projects FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_member(auth.uid(), organization_id)
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

CREATE POLICY "Org members can delete org projects"
ON public.projects FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_org_member(auth.uid(), organization_id)
  OR organization_id = public.get_user_organization_id(auth.uid())
  OR public.is_super_admin(auth.uid())
);

-- 3. sessions : SELECT / UPDATE / INSERT basés sur l'appartenance d'organisation du projet
DROP POLICY IF EXISTS "Org members can view org sessions" ON public.sessions;
DROP POLICY IF EXISTS "Org members can update org sessions" ON public.sessions;
DROP POLICY IF EXISTS "Org members can insert org sessions" ON public.sessions;

CREATE POLICY "Org members can view org sessions"
ON public.sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR public.is_org_member(auth.uid(), p.organization_id)
        OR p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.reports r
    JOIN public.report_shares rs ON rs.report_id = r.id
    WHERE r.session_id = sessions.id
      AND rs.is_active = true
      AND (rs.expires_at IS NULL OR rs.expires_at > now())
  )
);

CREATE POLICY "Org members can update org sessions"
ON public.sessions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR public.is_org_member(auth.uid(), p.organization_id)
        OR p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);

CREATE POLICY "Org members can insert org sessions"
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR public.is_org_member(auth.uid(), p.organization_id)
        OR p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);

-- 4. questions : aligner sur l'appartenance d'organisation du projet
DROP POLICY IF EXISTS "Org members can view org questions" ON public.questions;
DROP POLICY IF EXISTS "Org members can insert org questions" ON public.questions;
DROP POLICY IF EXISTS "Org members can update org questions" ON public.questions;
DROP POLICY IF EXISTS "Org members can delete org questions" ON public.questions;

CREATE POLICY "Org members can view org questions"
ON public.questions FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can insert org questions"
ON public.questions FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can update org questions"
ON public.questions FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can delete org questions"
ON public.questions FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = questions.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

-- 5. evaluation_criteria : idem
DROP POLICY IF EXISTS "Org members can view org criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Org members can insert org criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Org members can update org criteria" ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Org members can delete org criteria" ON public.evaluation_criteria;

CREATE POLICY "Org members can view org criteria"
ON public.evaluation_criteria FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can insert org criteria"
ON public.evaluation_criteria FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can update org criteria"
ON public.evaluation_criteria FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

CREATE POLICY "Org members can delete org criteria"
ON public.evaluation_criteria FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = evaluation_criteria.project_id
    AND (p.created_by = auth.uid()
      OR public.is_org_member(auth.uid(), p.organization_id)
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid()))
));

-- 6. Backfill : s'assurer que tous les profils rattachés à une org figurent bien dans organization_members
INSERT INTO public.organization_members (user_id, organization_id)
SELECT user_id, organization_id FROM public.profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Inclure aussi les propriétaires d'organisation s'ils manquent
INSERT INTO public.organization_members (user_id, organization_id)
SELECT owner_id, id FROM public.organizations
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;
