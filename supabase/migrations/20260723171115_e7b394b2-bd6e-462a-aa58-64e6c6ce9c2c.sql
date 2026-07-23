
CREATE OR REPLACE FUNCTION public.has_project_access(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project
      AND (
        p.created_by = _user
        OR _user = ANY (p.visible_to_user_ids)
        OR public.is_org_member(_user, p.organization_id)
        OR p.organization_id = public.get_user_organization_id(_user)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p.organization_id AND o.owner_id = _user)
        OR public.is_super_admin(_user)
      )
  )
$$;

CREATE POLICY "Shared project users can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (public.has_project_access(auth.uid(), project_id));

CREATE POLICY "Shared project users can view session_messages"
ON public.session_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  WHERE s.id = session_messages.session_id
    AND public.has_project_access(auth.uid(), s.project_id)
));

CREATE POLICY "Shared project users can view reports"
ON public.reports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  WHERE s.id = reports.session_id
    AND public.has_project_access(auth.uid(), s.project_id)
));

CREATE POLICY "Shared project users can view transcripts"
ON public.transcripts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  WHERE s.id = transcripts.session_id
    AND public.has_project_access(auth.uid(), s.project_id)
));
