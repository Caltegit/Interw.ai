CREATE TYPE public.feedback_status AS ENUM ('open', 'resolved');

CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.feedback_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  subject text NOT NULL,
  status public.feedback_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_threads_user ON public.feedback_threads(user_id);
CREATE INDEX idx_feedback_threads_last_msg ON public.feedback_threads(last_message_at DESC);

ALTER TABLE public.feedback_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feedback threads" ON public.feedback_threads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Users create own feedback threads" ON public.feedback_threads
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Author or super admin update threads" ON public.feedback_threads
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE POLICY "Author or super admin delete threads" ON public.feedback_threads
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_super_admin(auth.uid()));

CREATE TABLE public.feedback_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.feedback_threads(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  author_role text NOT NULL CHECK (author_role IN ('user', 'super_admin')),
  content text NOT NULL,
  read_by_recipient_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_feedback_messages_thread ON public.feedback_messages(thread_id, created_at);

ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View messages of accessible threads" ON public.feedback_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_threads t
    WHERE t.id = feedback_messages.thread_id
      AND (t.user_id = auth.uid() OR public.is_super_admin(auth.uid()))));

CREATE POLICY "Insert messages on accessible threads" ON public.feedback_messages
  FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.feedback_threads t
    WHERE t.id = feedback_messages.thread_id
      AND (t.user_id = auth.uid() OR public.is_super_admin(auth.uid()))));

CREATE POLICY "Update read marker on accessible threads" ON public.feedback_messages
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.feedback_threads t
    WHERE t.id = feedback_messages.thread_id
      AND (t.user_id = auth.uid() OR public.is_super_admin(auth.uid()))));

CREATE OR REPLACE FUNCTION public.bump_feedback_thread_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.feedback_threads
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.thread_id;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_bump_feedback_thread
  AFTER INSERT ON public.feedback_messages
  FOR EACH ROW EXECUTE FUNCTION public.bump_feedback_thread_on_message();

CREATE TRIGGER trg_feedback_threads_updated_at
  BEFORE UPDATE ON public.feedback_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();

ALTER TABLE public.feedback_messages REPLICA IDENTITY FULL;
ALTER TABLE public.feedback_threads REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback_threads;