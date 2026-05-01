DROP POLICY IF EXISTS "Org members can read their video exports" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage video exports" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read their video exports" ON storage.objects;

DROP TABLE IF EXISTS public.video_export_jobs CASCADE;