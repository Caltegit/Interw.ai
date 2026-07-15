-- Le SDK Storage effectue un pré-check d'existence (SELECT) lorsque
-- `upsert:true` est envoyé. Sans policy SELECT anon, ce pré-check
-- déclenche un « new row violates row-level security policy » côté
-- storage-api. On restaure la lecture anon uniquement sur `interviews/`.
CREATE POLICY "Anon can view interview media"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
);