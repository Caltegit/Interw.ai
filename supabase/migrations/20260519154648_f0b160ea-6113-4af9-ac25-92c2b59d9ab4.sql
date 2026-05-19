DROP FUNCTION IF EXISTS public.slugify(text);

CREATE OR REPLACE FUNCTION public.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(
           regexp_replace(
             lower(translate(
               coalesce(input, ''),
               'àáâãäåçèéêëìíîïñòóôõöùúûüýÿÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÑÒÓÔÕÖÙÚÛÜÝ',
               'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy'
             )),
             '[^a-z0-9]+', '-', 'g'
           ),
           '(^-+|-+$)', '', 'g'
         );
$$;

CREATE OR REPLACE FUNCTION public.ensure_project_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base text;
  candidate text;
  suffix int := 0;
BEGIN
  IF NEW.slug IS NULL OR length(trim(NEW.slug)) = 0 THEN
    base := nullif(public.slugify(NEW.title), '');
    IF base IS NULL THEN base := 'projet'; END IF;
    candidate := base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    WHILE EXISTS (SELECT 1 FROM public.projects WHERE slug = candidate AND id <> NEW.id) LOOP
      suffix := suffix + 1;
      candidate := base || '-' || substr(md5(random()::text || clock_timestamp()::text || suffix::text), 1, 6);
    END LOOP;
    NEW.slug := candidate;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_project_slug ON public.projects;
CREATE TRIGGER trg_ensure_project_slug
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.ensure_project_slug();

UPDATE public.projects
SET slug = NULL
WHERE slug IS NOT NULL AND length(trim(slug)) = 0;

UPDATE public.projects p
SET slug = public.slugify(coalesce(nullif(p.title, ''), 'projet')) || '-' || substr(md5(p.id::text), 1, 6)
WHERE p.slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS projects_slug_unique_idx ON public.projects (slug) WHERE slug IS NOT NULL;