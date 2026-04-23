CREATE OR REPLACE FUNCTION public.seed_demo_project(_org_id uuid, _created_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _project_id uuid;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE organization_id = _org_id AND title = 'Candidature spontanée - TEST -'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.projects (
    organization_id, created_by, title, job_title, description, status, language,
    ai_persona_name, ai_voice, tts_provider, tts_voice_gender, tts_voice_id,
    avatar_image_url,
    max_duration_minutes, record_audio, record_video, allow_pause,
    intro_enabled, intro_mode, intro_text,
    completion_message, slug
  ) VALUES (
    _org_id, _created_by, 'Candidature spontanée - TEST -', 'Candidature spontanée',
    'Projet de démo pré-rempli pour découvrir Interw.ai.',
    'active', 'fr', 'Camille', 'female_fr', 'elevenlabs', 'female', 'XB0fDUnXU5powFXDhCwa',
    'https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/media/defaults/avatar-camille.jpg',
    30, true, false, true,
    true, 'tts',
    'Bienvenue dans cette session de test. Voici le message de bienvenue que vous pouvez modifier. Suivrons 5 questions pour le candidat.',
    'Merci pour votre temps ! Votre session est terminée.',
    'candidature-spontanee-' || substr(md5(random()::text || _org_id::text), 1, 8)
  ) RETURNING id INTO _project_id;

  INSERT INTO public.questions (project_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level)
  VALUES
    (_project_id, 0, 'Bien-être', 'Comment ça va aujourd''hui ?', 'open', false, 0, 'light'),
    (_project_id, 1, 'Dernière expérience', 'Parlez-moi de votre dernière expérience professionnelle en quelques minutes. C''est à vous.', 'open', false, 0, 'light'),
    (_project_id, 2, 'Motivation', 'Pourquoi avoir choisi notre entreprise, qu''est-ce qui vous motive à nous rejoindre ?', 'open', false, 0, 'light'),
    (_project_id, 3, 'Hors travail', 'Que faites-vous en dehors du travail ? À quoi occupez-vous votre temps libre ?', 'open', false, 0, 'light'),
    (_project_id, 4, 'Mot de la fin', 'Un dernier mot avant qu''on se quitte ?', 'open', false, 0, 'light');

  INSERT INTO public.evaluation_criteria (project_id, order_index, label, description, weight, scoring_scale, applies_to)
  VALUES
    (_project_id, 0, 'Clarté du discours', 'Capacité à structurer sa pensée et à s''exprimer de façon claire, concise et compréhensible. Le candidat va à l''essentiel sans se perdre dans les détails inutiles.', 34, '0-5', 'all_questions'),
    (_project_id, 1, 'Motivation & adhésion au poste', 'Le candidat démontre un intérêt sincère et documenté pour le poste et l''entreprise, au-delà des formules convenues.', 33, '0-5', 'all_questions'),
    (_project_id, 2, 'Adéquation culturelle', 'Alignement perçu entre les valeurs, le mode de fonctionnement et la personnalité du candidat avec la culture de l''entreprise et l''esprit de l''équipe.', 33, '0-5', 'all_questions');
END;
$function$;

-- Désactiver les relances sur tous les projets démo existants
UPDATE public.questions
SET follow_up_enabled = false, max_follow_ups = 0, relance_level = 'light'
WHERE project_id IN (
  SELECT id FROM public.projects WHERE title = 'Candidature spontanée - TEST -'
);