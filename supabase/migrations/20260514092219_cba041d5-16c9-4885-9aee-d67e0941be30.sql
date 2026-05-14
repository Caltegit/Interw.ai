
CREATE TABLE public.copilot_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'Nouvelle conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_copilot_threads_project_user ON public.copilot_threads(project_id, created_by, updated_at DESC);

CREATE TABLE public.copilot_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES public.copilot_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL DEFAULT '',
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_copilot_messages_thread ON public.copilot_messages(thread_id, created_at);

ALTER TABLE public.copilot_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copilot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own copilot threads"
ON public.copilot_threads FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = copilot_threads.project_id
      AND (p.created_by = auth.uid()
           OR p.organization_id = get_user_organization_id(auth.uid())
           OR is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Users insert own copilot threads"
ON public.copilot_threads FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = copilot_threads.project_id
      AND (p.created_by = auth.uid()
           OR p.organization_id = get_user_organization_id(auth.uid())
           OR is_super_admin(auth.uid()))
  )
);

CREATE POLICY "Users update own copilot threads"
ON public.copilot_threads FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users delete own copilot threads"
ON public.copilot_threads FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users view own copilot messages"
ON public.copilot_messages FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.copilot_threads t
  WHERE t.id = copilot_messages.thread_id AND t.created_by = auth.uid()
));

CREATE POLICY "Users insert own copilot messages"
ON public.copilot_messages FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.copilot_threads t
  WHERE t.id = copilot_messages.thread_id AND t.created_by = auth.uid()
));

CREATE POLICY "Users delete own copilot messages"
ON public.copilot_messages FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.copilot_threads t
  WHERE t.id = copilot_messages.thread_id AND t.created_by = auth.uid()
));

CREATE TRIGGER set_copilot_threads_updated_at
BEFORE UPDATE ON public.copilot_threads
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();
