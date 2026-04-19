-- Config table (single row)
CREATE TABLE public.email_alert_config (
  id integer PRIMARY KEY DEFAULT 1,
  failure_threshold integer NOT NULL DEFAULT 5,
  window_minutes integer NOT NULL DEFAULT 60,
  cooldown_hours integer NOT NULL DEFAULT 6,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_alert_config_singleton CHECK (id = 1)
);

INSERT INTO public.email_alert_config (id) VALUES (1);

ALTER TABLE public.email_alert_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages alert config"
  ON public.email_alert_config FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Super admins can view alert config"
  ON public.email_alert_config FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update alert config"
  ON public.email_alert_config FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Alert log
CREATE TABLE public.email_alert_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triggered_at timestamptz NOT NULL DEFAULT now(),
  failure_count integer NOT NULL,
  threshold integer NOT NULL,
  window_minutes integer NOT NULL,
  recipients_notified integer NOT NULL DEFAULT 0,
  details jsonb
);

CREATE INDEX idx_email_alert_log_triggered_at ON public.email_alert_log (triggered_at DESC);

ALTER TABLE public.email_alert_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages alert log"
  ON public.email_alert_log FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Super admins can view alert log"
  ON public.email_alert_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));