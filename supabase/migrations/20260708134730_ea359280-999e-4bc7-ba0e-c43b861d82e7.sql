-- ============================================================================
-- Retirer les policies SELECT anon/public qui permettent le listing des
-- buckets publics. Les fichiers restent servis via leur URL directe (CDN)
-- sans policy — c'est le pattern "public bucket, non-listable".
-- ============================================================================
DROP POLICY IF EXISTS "Anon can view media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;
DROP POLICY IF EXISTS "Tutorials public read" ON storage.objects;
DROP POLICY IF EXISTS "Public can read feedback attachments" ON storage.objects;

-- On garde la lecture des logos d'organisation (chemin scopé, non listable
-- car limité au sous-dossier org-logos).
-- La policy "Org logos public read" existante reste en place.

-- Les org members authentifiés continuent à lister media/candidate-cvs via
-- leurs policies dédiées ("Org members can view media", etc.). Les CV et
-- exports vidéo restent en buckets privés.

-- ============================================================================
-- search_path fixe sur les 2 triggers restants
-- ============================================================================
ALTER FUNCTION public.report_jobs_set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.tg_set_updated_at() SET search_path = public, pg_temp;
