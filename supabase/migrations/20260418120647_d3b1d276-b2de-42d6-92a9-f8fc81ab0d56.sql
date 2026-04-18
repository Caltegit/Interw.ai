
CREATE TABLE public.email_template_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  template_key text NOT NULL,
  subject text NOT NULL DEFAULT '',
  html_body text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (organization_id, template_key)
);

CREATE INDEX idx_email_template_overrides_org_key ON public.email_template_overrides(organization_id, template_key);

ALTER TABLE public.email_template_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view overrides"
  ON public.email_template_overrides FOR SELECT
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can insert overrides"
  ON public.email_template_overrides FOR INSERT
  TO authenticated
  WITH CHECK (is_org_admin(auth.uid(), organization_id) AND updated_by = auth.uid());

CREATE POLICY "Org admins can update overrides"
  ON public.email_template_overrides FOR UPDATE
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete overrides"
  ON public.email_template_overrides FOR DELETE
  TO authenticated
  USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Super admins can manage all overrides"
  ON public.email_template_overrides FOR ALL
  TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_email_override_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_email_override_updated_at
BEFORE UPDATE ON public.email_template_overrides
FOR EACH ROW EXECUTE FUNCTION public.set_email_override_updated_at();
