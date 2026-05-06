DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Org members can view reports"
ON public.reports FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.id = reports.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = public.get_user_organization_id(auth.uid())
         OR public.is_super_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
CREATE POLICY "Org members can update reports"
ON public.reports FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.id = reports.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = public.get_user_organization_id(auth.uid())
         OR public.is_super_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Users can view own transcripts" ON public.transcripts;
CREATE POLICY "Org members can view transcripts"
ON public.transcripts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.id = transcripts.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = public.get_user_organization_id(auth.uid())
         OR public.is_super_admin(auth.uid()))
));

DROP POLICY IF EXISTS "Users can view own session messages" ON public.session_messages;
CREATE POLICY "Org members can view session messages"
ON public.session_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.sessions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.id = session_messages.session_id
    AND (p.created_by = auth.uid()
         OR p.organization_id = public.get_user_organization_id(auth.uid())
         OR public.is_super_admin(auth.uid()))
));