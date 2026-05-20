
-- 1) Add organization_id columns
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.session_messages ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 2) Backfill
UPDATE public.sessions s
SET organization_id = p.organization_id
FROM public.projects p
WHERE p.id = s.project_id AND s.organization_id IS NULL;

UPDATE public.session_messages sm
SET organization_id = s.organization_id
FROM public.sessions s
WHERE s.id = sm.session_id AND sm.organization_id IS NULL;

-- 3) NOT NULL + index
ALTER TABLE public.sessions ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE public.session_messages ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_organization_id ON public.sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_organization_id ON public.session_messages(organization_id);

-- 4) Auto-fill triggers
CREATE OR REPLACE FUNCTION public.set_session_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.projects WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_session_org_id ON public.sessions;
CREATE TRIGGER trg_set_session_org_id
BEFORE INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_session_organization_id();

CREATE OR REPLACE FUNCTION public.set_session_message_organization_id()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.session_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id FROM public.sessions WHERE id = NEW.session_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_session_msg_org_id ON public.session_messages;
CREATE TRIGGER trg_set_session_msg_org_id
BEFORE INSERT ON public.session_messages
FOR EACH ROW EXECUTE FUNCTION public.set_session_message_organization_id();

-- 5) SESSIONS — drop ALL existing redundant policies
DROP POLICY IF EXISTS "Anon can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anon can select sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anon can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Anon can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Users can view own project sessions" ON public.sessions;
DROP POLICY IF EXISTS "Org members and super admins can delete sessions" ON public.sessions;

-- Recreate scoped policies for sessions
CREATE POLICY "Org members can view sessions"
ON public.sessions FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Org members can update sessions"
ON public.sessions FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Org members can delete sessions"
ON public.sessions FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Authenticated can insert sessions on accessible projects"
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
    AND (p.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid())))
);

CREATE POLICY "Anon can insert sessions on active projects"
ON public.sessions FOR INSERT TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status = 'active')
);

CREATE POLICY "Anon can view sessions on active projects"
ON public.sessions FOR SELECT TO anon
USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status = 'active')
);

CREATE POLICY "Anon can update sessions on active projects"
ON public.sessions FOR UPDATE TO anon
USING (
  EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.status = 'active')
);

-- 6) SESSION_MESSAGES — drop ALL existing redundant policies
DROP POLICY IF EXISTS "Anon can view session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can insert session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can update session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Anon can insert messages" ON public.session_messages;
DROP POLICY IF EXISTS "Authenticated can view session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Authenticated can insert session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Authenticated can update session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Org members can view session messages" ON public.session_messages;
DROP POLICY IF EXISTS "Org members and super admins can delete session messages" ON public.session_messages;

CREATE POLICY "Org members can view session messages"
ON public.session_messages FOR SELECT TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Org members can insert session messages"
ON public.session_messages FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id
    AND (s.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid())))
);

CREATE POLICY "Org members can update session messages"
ON public.session_messages FOR UPDATE TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Org members can delete session messages"
ON public.session_messages FOR DELETE TO authenticated
USING (organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()));

CREATE POLICY "Anon can view session messages on active projects"
ON public.session_messages FOR SELECT TO anon
USING (
  EXISTS (SELECT 1 FROM public.sessions s JOIN public.projects p ON p.id = s.project_id
          WHERE s.id = session_id AND p.status = 'active')
);

CREATE POLICY "Anon can insert session messages on active projects"
ON public.session_messages FOR INSERT TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM public.sessions s JOIN public.projects p ON p.id = s.project_id
          WHERE s.id = session_id AND p.status = 'active')
);

CREATE POLICY "Anon can update session messages on active projects"
ON public.session_messages FOR UPDATE TO anon
USING (
  EXISTS (SELECT 1 FROM public.sessions s JOIN public.projects p ON p.id = s.project_id
          WHERE s.id = session_id AND p.status = 'active')
);
