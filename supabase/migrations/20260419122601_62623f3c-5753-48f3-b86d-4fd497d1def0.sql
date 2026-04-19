CREATE TABLE public.criteria_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  weight integer NOT NULL DEFAULT 0,
  scoring_scale public.scoring_scale_type NOT NULL DEFAULT '0-5',
  applies_to public.criteria_scope NOT NULL DEFAULT 'all_questions',
  anchors jsonb DEFAULT '{}'::jsonb,
  category text
);

ALTER TABLE public.criteria_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view criteria templates"
ON public.criteria_templates FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create criteria templates"
ON public.criteria_templates FOR INSERT TO authenticated
WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()) AND created_by = auth.uid());

CREATE POLICY "Org members can update criteria templates"
ON public.criteria_templates FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete criteria templates"
ON public.criteria_templates FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE INDEX idx_criteria_templates_org ON public.criteria_templates(organization_id);