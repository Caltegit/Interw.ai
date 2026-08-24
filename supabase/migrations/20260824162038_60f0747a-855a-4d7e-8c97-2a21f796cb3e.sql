-- Table de télémétrie micro : capte les incidents côté candidat
-- (piste morte, silence, bascule de micro, échec d'accès média)
-- pour diagnostiquer les sessions avec capture audio perdue.
CREATE TABLE public.mic_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text NOT NULL DEFAULT '',
  browser text,
  browser_version text,
  os text,
  device_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mic_events_session_id ON public.mic_events(session_id);
CREATE INDEX idx_mic_events_created_at ON public.mic_events(created_at DESC);
CREATE INDEX idx_mic_events_event ON public.mic_events(event);

GRANT SELECT ON public.mic_events TO authenticated;
GRANT ALL ON public.mic_events TO service_role;

ALTER TABLE public.mic_events ENABLE ROW LEVEL SECURITY;

-- Lecture réservée aux super admins (vue dans /admin/system)
CREATE POLICY "Super admins can read mic_events"
  ON public.mic_events
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- Fonction pour récupérer l'ID de session à partir du token candidat
-- (déjà existante : public.get_session_id_by_token). On l'utilise côté edge function.