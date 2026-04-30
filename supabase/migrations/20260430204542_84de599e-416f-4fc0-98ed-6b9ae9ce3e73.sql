ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS intro_first_screen boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.projects.intro_first_screen IS
'Si true, l''intro candidat (texte/audio/vidéo/TTS) est affichée avant le formulaire d''inscription.';