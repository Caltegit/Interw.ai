-- Revert: restore previous open RLS policies on sessions, session_messages, projects

-- sessions
DROP POLICY IF EXISTS "Org members can view org sessions" ON public.sessions;
DROP POLICY IF EXISTS "Org members can update org sessions" ON public.sessions;
DROP POLICY IF EXISTS "Org members can insert org sessions" ON public.sessions;

CREATE POLICY "Authenticated can view sessions"
  ON public.sessions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update sessions"
  ON public.sessions FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated can create sessions"
  ON public.sessions FOR INSERT TO authenticated
  WITH CHECK (true);

-- session_messages
DROP POLICY IF EXISTS "Org members can insert org session messages" ON public.session_messages;

CREATE POLICY "Anon can insert session messages"
  ON public.session_messages FOR INSERT TO anon, authenticated
  WITH CHECK (true);
