-- 1) Faire évoluer l'enum feedback_status en recréant un type propre
-- Renommer l'ancien type
ALTER TYPE public.feedback_status RENAME TO feedback_status_old;

-- Créer le nouveau type avec les 3 valeurs souhaitées
CREATE TYPE public.feedback_status AS ENUM ('open', 'in_progress', 'archived');

-- Migrer la colonne : open reste open, resolved devient archived
ALTER TABLE public.feedback_threads 
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.feedback_threads 
  ALTER COLUMN status TYPE public.feedback_status 
  USING (
    CASE status::text
      WHEN 'resolved' THEN 'archived'::public.feedback_status
      WHEN 'open' THEN 'open'::public.feedback_status
      ELSE 'open'::public.feedback_status
    END
  );

ALTER TABLE public.feedback_threads 
  ALTER COLUMN status SET DEFAULT 'open'::public.feedback_status;

-- Supprimer l'ancien type
DROP TYPE public.feedback_status_old;

-- 2) Bucket de stockage pour les pièces jointes
INSERT INTO storage.buckets (id, name, public)
VALUES ('feedback-attachments', 'feedback-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage
CREATE POLICY "Auth can upload feedback attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

CREATE POLICY "Public can read feedback attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-attachments');

CREATE POLICY "Auth can delete own feedback attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'feedback-attachments' AND owner = auth.uid());

-- 3) Permettre aux super admins de supprimer les messages de feedback
CREATE POLICY "Super admins can delete feedback messages"
ON public.feedback_messages FOR DELETE
TO authenticated
USING (is_super_admin(auth.uid()));