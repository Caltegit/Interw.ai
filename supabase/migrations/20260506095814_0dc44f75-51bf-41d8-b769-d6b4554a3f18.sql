CREATE POLICY "Auth can update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Auth can delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'media' AND auth.uid() IS NOT NULL);