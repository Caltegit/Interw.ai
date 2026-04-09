-- Allow authenticated users to delete sessions they own (via project)
CREATE POLICY "Users can delete own project sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM projects WHERE projects.id = sessions.project_id AND projects.created_by = auth.uid()
));

-- Allow authenticated users to delete session messages for their sessions
CREATE POLICY "Users can delete own session messages"
ON public.session_messages
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id
  WHERE s.id = session_messages.session_id AND p.created_by = auth.uid()
));

-- Allow authenticated users to delete reports for their sessions
CREATE POLICY "Users can delete own reports"
ON public.reports
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id
  WHERE s.id = reports.session_id AND p.created_by = auth.uid()
));

-- Allow authenticated users to delete transcripts for their sessions
CREATE POLICY "Users can delete own transcripts"
ON public.transcripts
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM sessions s JOIN projects p ON p.id = s.project_id
  WHERE s.id = transcripts.session_id AND p.created_by = auth.uid()
));