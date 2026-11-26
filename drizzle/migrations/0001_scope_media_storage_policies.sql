-- Candidates (anonymous): only files of a session that is still open
DROP POLICY IF EXISTS "Anon can view interview media" ON storage.objects;
CREATE POLICY "Anon can view interview media" ON storage.objects
FOR SELECT TO anon
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.status IN ('pending','video_viewed','in_progress')
  )
);

DROP POLICY IF EXISTS "Anon can update interview media" ON storage.objects;
CREATE POLICY "Anon can update interview media" ON storage.objects
FOR UPDATE TO anon
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.status IN ('pending','video_viewed','in_progress')
  )
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id::text = (storage.foldername(name))[2]
      AND s.status IN ('pending','video_viewed','in_progress')
  )
);

-- Recruiters: candidate files only for their organisation; other files by uploader
DROP POLICY IF EXISTS "Org members can view media" ON storage.objects;
CREATE POLICY "Org members can view media" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'media'
  AND (
    public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = 'interviews'
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND public.is_org_member(auth.uid(), s.organization_id)
      )
    )
    OR (
      (storage.foldername(name))[1] IS DISTINCT FROM 'interviews'
      AND auth.uid() IS NOT NULL
    )
  )
);

DROP POLICY IF EXISTS "Auth can update media" ON storage.objects;
CREATE POLICY "Auth can update media" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'media'
  AND (
    owner_id = (select auth.uid()::text)
    OR public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = 'interviews'
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND public.is_org_member(auth.uid(), s.organization_id)
      )
    )
  )
)
WITH CHECK (
  bucket_id = 'media'
  AND (
    owner_id = (select auth.uid()::text)
    OR public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = 'interviews'
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND public.is_org_member(auth.uid(), s.organization_id)
      )
    )
  )
);

DROP POLICY IF EXISTS "Auth can delete media" ON storage.objects;
CREATE POLICY "Auth can delete media" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'media'
  AND (
    owner_id = (select auth.uid()::text)
    OR public.is_super_admin(auth.uid())
    OR (
      (storage.foldername(name))[1] = 'interviews'
      AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id::text = (storage.foldername(name))[2]
          AND public.is_org_member(auth.uid(), s.organization_id)
      )
    )
  )
);

-- Logos: public branding, limited to real organisations
DROP POLICY IF EXISTS "Org logos public read" ON storage.objects;
CREATE POLICY "Org logos public read" ON storage.objects
FOR SELECT TO public
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'org-logos'
  AND EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id::text = (storage.foldername(name))[2]
  )
);