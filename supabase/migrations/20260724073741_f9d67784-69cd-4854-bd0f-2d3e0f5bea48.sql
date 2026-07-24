-- Mise à jour des politiques RLS du copilot pour prendre en compte le partage de projet

-- === copilot_threads ===
DROP POLICY IF EXISTS "Users insert own copilot threads" ON public.copilot_threads;
DROP POLICY IF EXISTS "Users view own copilot threads" ON public.copilot_threads;
DROP POLICY IF EXISTS "Users update own copilot threads" ON public.copilot_threads;
DROP POLICY IF EXISTS "Users delete own copilot threads" ON public.copilot_threads;

CREATE POLICY "Users insert own copilot threads"
ON public.copilot_threads
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users view own copilot threads"
ON public.copilot_threads
FOR SELECT
TO authenticated
USING (
  public.has_project_access(auth.uid(), project_id)
);

CREATE POLICY "Users update own copilot threads"
ON public.copilot_threads
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users delete own copilot threads"
ON public.copilot_threads
FOR DELETE
TO authenticated
USING (created_by = auth.uid());

-- === copilot_messages ===
DROP POLICY IF EXISTS "Users insert own copilot messages" ON public.copilot_messages;
DROP POLICY IF EXISTS "Users view own copilot messages" ON public.copilot_messages;
DROP POLICY IF EXISTS "Users delete own copilot messages" ON public.copilot_messages;

CREATE POLICY "Users insert own copilot messages"
ON public.copilot_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.copilot_threads t
    WHERE t.id = copilot_messages.thread_id
      AND public.has_project_access(auth.uid(), t.project_id)
  )
);

CREATE POLICY "Users view own copilot messages"
ON public.copilot_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copilot_threads t
    WHERE t.id = copilot_messages.thread_id
      AND public.has_project_access(auth.uid(), t.project_id)
  )
);

CREATE POLICY "Users delete own copilot messages"
ON public.copilot_messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.copilot_threads t
    WHERE t.id = copilot_messages.thread_id
      AND t.created_by = auth.uid()
  )
);