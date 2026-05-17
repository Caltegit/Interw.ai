
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS candidate_linkedin_url text,
  ADD COLUMN IF NOT EXISTS candidate_cv_url text,
  ADD COLUMN IF NOT EXISTS candidate_cv_filename text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('candidate-cvs', 'candidate-cvs', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies on storage.objects for candidate-cvs
-- Path convention: {session_id}/{filename}
CREATE POLICY "Org members can view candidate CVs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'candidate-cvs'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);

CREATE POLICY "Org members can upload candidate CVs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'candidate-cvs'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);

CREATE POLICY "Org members can update candidate CVs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'candidate-cvs'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);

CREATE POLICY "Org members can delete candidate CVs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'candidate-cvs'
  AND EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id::text = (storage.foldername(name))[1]
      AND (
        p.organization_id = public.get_user_organization_id(auth.uid())
        OR public.is_super_admin(auth.uid())
      )
  )
);
