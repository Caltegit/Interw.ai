
-- Allow any authenticated user (not just project owner) to create a session on an active project
CREATE POLICY "Authenticated can create sessions on active projects"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND p.status = 'active'
      AND (p.expires_at IS NULL OR p.expires_at > now())
  )
);

-- Same for reading/updating their own session as authenticated candidate
CREATE POLICY "Authenticated can view sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated can update sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (true);
