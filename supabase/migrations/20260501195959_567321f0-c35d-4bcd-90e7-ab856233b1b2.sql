-- sessions
DROP POLICY IF EXISTS "Users can delete own project sessions" ON public.sessions;
CREATE POLICY "Org members and super admins can delete sessions"
ON public.sessions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- session_messages
DROP POLICY IF EXISTS "Users can delete own session messages" ON public.session_messages;
CREATE POLICY "Org members and super admins can delete session messages"
ON public.session_messages FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = session_messages.session_id AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- reports
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
CREATE POLICY "Org members and super admins can delete reports"
ON public.reports FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = reports.session_id AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- transcripts
DROP POLICY IF EXISTS "Users can delete own transcripts" ON public.transcripts;
CREATE POLICY "Org members and super admins can delete transcripts"
ON public.transcripts FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = transcripts.session_id AND (
      p.created_by = auth.uid()
      OR p.organization_id = public.get_user_organization_id(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  )
);

-- report_shares (créés par l'utilisateur, pas forcément le même que celui qui supprime)
DROP POLICY IF EXISTS "Users can delete own report shares" ON public.report_shares;
CREATE POLICY "Org members and super admins can delete report shares"
ON public.report_shares FOR DELETE TO authenticated
USING (
  created_by = auth.uid()
  OR public.is_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.reports r
    JOIN public.sessions s ON s.id = r.session_id
    JOIN public.projects p ON p.id = s.project_id
    WHERE r.id = report_shares.report_id
      AND p.organization_id = public.get_user_organization_id(auth.uid())
  )
);