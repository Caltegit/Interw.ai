
CREATE TABLE public.global_email_template_overrides (
  template_key text PRIMARY KEY,
  subject text,
  intro_html text,
  outro_html text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_email_template_overrides TO authenticated;
GRANT ALL ON public.global_email_template_overrides TO service_role;

ALTER TABLE public.global_email_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage global email overrides"
  ON public.global_email_template_overrides
  FOR ALL
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE TRIGGER trg_global_email_override_updated_at
  BEFORE UPDATE ON public.global_email_template_overrides
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_override_updated_at();
