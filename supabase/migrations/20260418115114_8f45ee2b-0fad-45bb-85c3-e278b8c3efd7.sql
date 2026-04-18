CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug text;

CREATE OR REPLACE FUNCTION public.slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public, extensions
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(public.unaccent(coalesce(_input, ''))),
    '[^a-z0-9]+', '-', 'g'
  ))
$$;

DO $$
DECLARE
  org RECORD;
  base_slug text;
  candidate text;
  counter int;
BEGIN
  FOR org IN SELECT id, name FROM public.organizations WHERE slug IS NULL ORDER BY created_at LOOP
    base_slug := public.slugify(org.name);
    IF base_slug = '' OR base_slug IS NULL THEN
      base_slug := 'org';
    END IF;
    candidate := base_slug;
    counter := 1;
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate) LOOP
      counter := counter + 1;
      candidate := base_slug || '-' || counter;
    END LOOP;
    UPDATE public.organizations SET slug = candidate WHERE id = org.id;
  END LOOP;
END $$;

ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS organizations_slug_unique ON public.organizations(slug);

ALTER TABLE public.organizations 
  ADD CONSTRAINT organizations_slug_format 
  CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 2 AND 60);

CREATE POLICY "Anon can view orgs by slug"
ON public.organizations
FOR SELECT
TO anon
USING (true);
