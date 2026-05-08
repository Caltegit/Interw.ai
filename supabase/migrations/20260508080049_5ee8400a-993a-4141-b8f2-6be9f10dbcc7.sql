CREATE OR REPLACE FUNCTION public.set_updated_at_now()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.candidate_message_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, key)
);

ALTER TABLE public.candidate_message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view candidate message templates"
  ON public.candidate_message_templates FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can insert candidate message templates"
  ON public.candidate_message_templates FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can update candidate message templates"
  ON public.candidate_message_templates FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete candidate message templates"
  ON public.candidate_message_templates FOR DELETE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE TRIGGER trg_candidate_message_templates_updated_at
BEFORE UPDATE ON public.candidate_message_templates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_now();