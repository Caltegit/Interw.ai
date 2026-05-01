
-- Backfill: ajouter les 2 intros par défaut à toutes les organisations existantes
DO $$
DECLARE
  org RECORD;
  creator_id uuid;
  charlotte_voice text := 'XB0fDUnXU5powFXDhCwa';
  intro_confiance text := 'Bonjour, et bienvenue. Avant de commencer, prenez une grande respiration. Cet entretien est un échange, pas un examen. Il n''y a pas de mauvaise réponse, juste votre histoire et votre regard. Soyez vous-même, exprimez-vous à votre rythme, et profitez de ce moment pour partager ce qui vous rend unique.';
  intro_cadrage text := 'Bonjour, et bienvenue dans cet entretien. Voici comment ça va se passer. Je vais vous poser plusieurs questions, auxquelles vous répondrez à l''oral. Prenez le temps de réfléchir avant chaque réponse, parlez clairement, et n''hésitez pas à développer vos idées. L''entretien est enregistré pour être ensuite analysé. C''est parti, bonne chance.';
BEGIN
  FOR org IN SELECT id, owner_id FROM public.organizations LOOP
    -- Choisir un créateur valide (owner ou premier admin)
    creator_id := org.owner_id;
    IF creator_id IS NULL THEN
      SELECT user_id INTO creator_id 
      FROM public.user_roles 
      WHERE organization_id = org.id 
      LIMIT 1;
    END IF;
    
    IF creator_id IS NOT NULL THEN
      -- Mise en confiance
      IF NOT EXISTS (
        SELECT 1 FROM public.intro_templates 
        WHERE organization_id = org.id AND name = 'Mise en confiance'
      ) THEN
        INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
        VALUES (org.id, creator_id, 'Mise en confiance', 'tts', 
          'Intro rassurante pour mettre le candidat à l''aise (≈10s)', 
          intro_confiance, charlotte_voice);
      END IF;
      
      -- Cadrage de l'entretien
      IF NOT EXISTS (
        SELECT 1 FROM public.intro_templates 
        WHERE organization_id = org.id AND name = 'Cadrage de l''entretien'
      ) THEN
        INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
        VALUES (org.id, creator_id, 'Cadrage de l''entretien', 'tts', 
          'Intro qui explique le déroulé de l''entretien au candidat (≈12s)', 
          intro_cadrage, charlotte_voice);
      END IF;
    END IF;
  END LOOP;
END $$;

-- Mettre à jour la fonction de seed pour les futures organisations
CREATE OR REPLACE FUNCTION public.seed_default_intro_templates(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Mise en confiance',
    'tts',
    'Intro rassurante pour mettre le candidat à l''aise (≈10s)',
    'Bonjour, et bienvenue. Avant de commencer, prenez une grande respiration. Cet entretien est un échange, pas un examen. Il n''y a pas de mauvaise réponse, juste votre histoire et votre regard. Soyez vous-même, exprimez-vous à votre rythme, et profitez de ce moment pour partager ce qui vous rend unique.',
    'XB0fDUnXU5powFXDhCwa'
  )
  ON CONFLICT DO NOTHING;
  
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Cadrage de l''entretien',
    'tts',
    'Intro qui explique le déroulé de l''entretien au candidat (≈12s)',
    'Bonjour, et bienvenue dans cet entretien. Voici comment ça va se passer. Je vais vous poser plusieurs questions, auxquelles vous répondrez à l''oral. Prenez le temps de réfléchir avant chaque réponse, parlez clairement, et n''hésitez pas à développer vos idées. L''entretien est enregistré pour être ensuite analysé. C''est parti, bonne chance.',
    'XB0fDUnXU5powFXDhCwa'
  )
  ON CONFLICT DO NOTHING;
END;
$$;
