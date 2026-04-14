
CREATE OR REPLACE FUNCTION public.delete_project(_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller owns the project
  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to delete this project';
  END IF;

  -- Delete report_shares for all reports linked to project sessions
  DELETE FROM public.report_shares
  WHERE report_id IN (
    SELECT r.id FROM public.reports r
    JOIN public.sessions s ON s.id = r.session_id
    WHERE s.project_id = _project_id
  );

  -- Delete reports
  DELETE FROM public.reports
  WHERE session_id IN (SELECT id FROM public.sessions WHERE project_id = _project_id);

  -- Delete transcripts
  DELETE FROM public.transcripts
  WHERE session_id IN (SELECT id FROM public.sessions WHERE project_id = _project_id);

  -- Delete session messages
  DELETE FROM public.session_messages
  WHERE session_id IN (SELECT id FROM public.sessions WHERE project_id = _project_id);

  -- Delete sessions
  DELETE FROM public.sessions WHERE project_id = _project_id;

  -- Delete questions
  DELETE FROM public.questions WHERE project_id = _project_id;

  -- Delete evaluation criteria
  DELETE FROM public.evaluation_criteria WHERE project_id = _project_id;

  -- Delete the project
  DELETE FROM public.projects WHERE id = _project_id;
END;
$$;
