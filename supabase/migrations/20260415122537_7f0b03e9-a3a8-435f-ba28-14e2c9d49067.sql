
CREATE TABLE public.question_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  content text NOT NULL,
  category text,
  follow_up_enabled boolean NOT NULL DEFAULT true,
  max_follow_ups integer NOT NULL DEFAULT 2,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.question_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view templates"
ON public.question_templates FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create templates"
ON public.question_templates FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Org members can update templates"
ON public.question_templates FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete templates"
ON public.question_templates FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE INDEX idx_question_templates_org ON public.question_templates(organization_id);
CREATE INDEX idx_question_templates_category ON public.question_templates(category);
