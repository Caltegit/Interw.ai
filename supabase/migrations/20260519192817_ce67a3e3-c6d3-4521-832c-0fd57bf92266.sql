CREATE POLICY "Authenticated can view active projects"
ON public.projects
FOR SELECT
TO authenticated
USING (status = 'active');