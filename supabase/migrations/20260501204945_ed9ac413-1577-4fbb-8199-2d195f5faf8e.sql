UPDATE public.projects
SET slug = 'conseiller-vente-histoire-or-marseille-' || substr(replace(id::text, '-', ''), 1, 8)
WHERE id = 'b6462cae-15cf-4419-b5a3-b6070a6ed717'
  AND slug IS NULL;