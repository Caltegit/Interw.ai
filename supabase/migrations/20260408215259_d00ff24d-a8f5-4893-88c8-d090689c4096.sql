-- Make media bucket public for video playback
UPDATE storage.buckets SET public = true WHERE id = 'media';

-- Allow anonymous users to upload interview recordings
CREATE POLICY "Anon can upload media" ON storage.objects
FOR INSERT TO anon
WITH CHECK (bucket_id = 'media');

-- Allow public read access to media files
CREATE POLICY "Public can view media" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'media');