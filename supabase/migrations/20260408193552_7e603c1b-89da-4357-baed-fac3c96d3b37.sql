
-- Drop overly permissive policies
DROP POLICY IF EXISTS "Candidates can view session by token" ON public.sessions;
DROP POLICY IF EXISTS "Candidates can update session by token" ON public.sessions;
DROP POLICY IF EXISTS "Candidates can insert messages" ON public.session_messages;
DROP POLICY IF EXISTS "Candidates can view messages" ON public.session_messages;

-- Create a function candidates use to look up sessions by token
CREATE OR REPLACE FUNCTION public.get_session_id_by_token(_token TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.sessions WHERE token = _token LIMIT 1
$$;

-- Anon can only SELECT sessions (app filters by token in the query)
CREATE POLICY "Anon can select sessions"
  ON public.sessions FOR SELECT
  TO anon
  USING (true);

-- Anon can only UPDATE sessions (edge function will handle actual updates via service role)
-- We remove direct anon UPDATE; updates will go through edge functions with service role key

-- Anon can view messages for any session (filtered by session_id in app)
CREATE POLICY "Anon can view messages"
  ON public.session_messages FOR SELECT
  TO anon
  USING (true);

-- Anon can insert messages (edge function will handle this with service role)
-- Remove direct anon INSERT on messages; edge functions handle it
