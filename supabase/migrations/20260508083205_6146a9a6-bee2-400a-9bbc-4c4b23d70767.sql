CREATE TABLE public.data_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  candidate_email text,
  source text NOT NULL CHECK (source IN (
    'cron_video_retention',
    'recruiter_manual',
    'candidate_self_request',
    'org_deletion',
    'candidate_cancel'
  )),
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

ALTER TABLE public.data_purge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view purge log"
  ON public.data_purge_log FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));

CREATE POLICY "Service role manages purge log"
  ON public.data_purge_log FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_data_purge_log_performed_at ON public.data_purge_log(performed_at DESC);
CREATE INDEX idx_data_purge_log_session_id ON public.data_purge_log(session_id);