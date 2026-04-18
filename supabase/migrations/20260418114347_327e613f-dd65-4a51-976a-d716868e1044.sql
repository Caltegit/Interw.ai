-- Create intro_templates table for reusable intro audio/video at organization level
CREATE TABLE public.intro_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL,
  created_by UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('audio', 'video')),
  audio_url TEXT,
  video_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.intro_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view intro templates"
ON public.intro_templates FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can create intro templates"
ON public.intro_templates FOR INSERT TO authenticated
WITH CHECK (
  organization_id = public.get_user_organization_id(auth.uid())
  AND created_by = auth.uid()
);

CREATE POLICY "Org members can update intro templates"
ON public.intro_templates FOR UPDATE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Org members can delete intro templates"
ON public.intro_templates FOR DELETE TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE INDEX idx_intro_templates_org ON public.intro_templates(organization_id);