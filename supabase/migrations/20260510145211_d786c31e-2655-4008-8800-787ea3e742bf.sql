CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.project_public_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT false,
  slug_public text NOT NULL UNIQUE,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  cover_image_url text,
  seo_title text,
  seo_description text,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_public_pages_slug ON public.project_public_pages(slug_public);

ALTER TABLE public.project_public_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon view active public pages"
ON public.project_public_pages FOR SELECT TO anon
USING (enabled = true);

CREATE POLICY "Org members view public pages"
ON public.project_public_pages FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_public_pages.project_id
  AND (p.created_by = auth.uid() OR p.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()))));

CREATE POLICY "Org members insert public pages"
ON public.project_public_pages FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_public_pages.project_id
  AND (p.created_by = auth.uid() OR p.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()))));

CREATE POLICY "Org members update public pages"
ON public.project_public_pages FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_public_pages.project_id
  AND (p.created_by = auth.uid() OR p.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()))));

CREATE POLICY "Org members delete public pages"
ON public.project_public_pages FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM projects p WHERE p.id = project_public_pages.project_id
  AND (p.created_by = auth.uid() OR p.organization_id = get_user_organization_id(auth.uid()) OR is_super_admin(auth.uid()))));

CREATE TRIGGER trg_project_public_pages_updated_at
BEFORE UPDATE ON public.project_public_pages
FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();