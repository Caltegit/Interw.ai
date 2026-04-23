-- Colonne manifest pour les chunks vidéo streamés
ALTER TABLE public.session_messages
  ADD COLUMN IF NOT EXISTS video_chunks_manifest_url text;

-- Activer les extensions nécessaires pour le cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;