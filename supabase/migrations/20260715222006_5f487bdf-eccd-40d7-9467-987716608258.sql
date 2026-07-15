-- Restaure la possibilité pour les candidats (anon) d'uploader leurs
-- enregistrements d'entretien avec upsert. Avant ce jour, l'API Storage
-- de Supabase acceptait `x-upsert:true` en mode INSERT-only pour anon.
-- Elle exige désormais qu'une policy UPDATE anon soit également en place,
-- sinon `INSERT ... ON CONFLICT DO UPDATE` échoue avec
-- « new row violates row-level security policy » — même pour un nouveau chemin.
-- Périmètre restreint au préfixe `interviews/` pour ne pas ouvrir tout le bucket.

CREATE POLICY "Anon can update interview media"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
)
WITH CHECK (
  bucket_id = 'media'
  AND (storage.foldername(name))[1] = 'interviews'
);