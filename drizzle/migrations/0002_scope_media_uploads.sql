DROP POLICY IF EXISTS "Anon can upload media" ON storage.objects;
CREATE POLICY "Anon can upload media" ON storage.objects FOR INSERT TO anon
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
  AND EXISTS (SELECT 1 FROM public.sessions s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.status IN ('pending','video_viewed','in_progress'))
);

DROP POLICY IF EXISTS "Org members can upload media" ON storage.objects;
CREATE POLICY "Org members can upload media" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'media'
  AND (select auth.uid()) IS NOT NULL
  AND (
    public.is_super_admin((select auth.uid()))
    OR (
      (storage.foldername(name))[1] = 'interviews'
      AND EXISTS (SELECT 1 FROM public.sessions s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND public.is_org_member((select auth.uid()), s.organization_id))
    )
    OR (
      coalesce((storage.foldername(name))[1], '') NOT IN ('interviews','org-logos')
      AND public.get_user_organization_id((select auth.uid())) IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Auth can upload feedback attachments" ON storage.objects;
CREATE POLICY "Auth can upload feedback attachments" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'feedback-attachments'
  AND (storage.foldername(name))[1] = (select auth.uid())::text
);

DROP POLICY IF EXISTS "Org logos public read" ON storage.objects;
CREATE POLICY "Org logos public read" ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND EXISTS (SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(objects.name))[2])
);