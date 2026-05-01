-- Table de suivi des jobs d'export vidéo
CREATE TABLE public.video_export_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','ready','failed')),
  zip_path TEXT,
  download_url TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_video_export_jobs_session ON public.video_export_jobs(session_id);
CREATE INDEX idx_video_export_jobs_status ON public.video_export_jobs(status);
CREATE INDEX idx_video_export_jobs_org ON public.video_export_jobs(organization_id);

ALTER TABLE public.video_export_jobs ENABLE ROW LEVEL SECURITY;

-- Lecture : membres de l'organisation propriétaire de la session
CREATE POLICY "Org members can view their export jobs"
ON public.video_export_jobs FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Insertion : utilisateur authentifié qui appartient à l'organisation
CREATE POLICY "Org members can request export jobs"
ON public.video_export_jobs FOR INSERT
TO authenticated
WITH CHECK (
  requested_by = auth.uid()
  AND organization_id IN (
    SELECT organization_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Bucket privé pour les archives ZIP
INSERT INTO storage.buckets (id, name, public)
VALUES ('video-exports', 'video-exports', false)
ON CONFLICT (id) DO NOTHING;

-- Aucune policy publique : accès uniquement via service role (URL signée envoyée par email)