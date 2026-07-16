CREATE TABLE public.session_reinvitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  new_session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  candidate_email text NOT NULL,
  candidate_name text NOT NULL,
  reason text NOT NULL DEFAULT 'upload_regression_july_2026',
  is_witness boolean NOT NULL DEFAULT false,
  email_sent_at timestamptz,
  email_status text,
  email_message_id text,
  resent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX session_reinvitations_original_sent_uniq
  ON public.session_reinvitations (original_session_id)
  WHERE email_sent_at IS NOT NULL;

CREATE INDEX session_reinvitations_project_idx ON public.session_reinvitations (project_id);
CREATE INDEX session_reinvitations_email_idx ON public.session_reinvitations (candidate_email);

GRANT SELECT, INSERT, UPDATE ON public.session_reinvitations TO authenticated;
GRANT ALL ON public.session_reinvitations TO service_role;

ALTER TABLE public.session_reinvitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins read reinvitations"
  ON public.session_reinvitations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_session_reinvitations_updated_at
  BEFORE UPDATE ON public.session_reinvitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();