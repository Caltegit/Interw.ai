-- 1. Fonction de seed des intros par défaut (4 modèles TTS)
CREATE OR REPLACE FUNCTION public.seed_default_intro_templates(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Idempotent : ne rien faire si l'organisation a déjà des intros
  IF EXISTS (SELECT 1 FROM public.intro_templates WHERE organization_id = _org_id) THEN
    RETURN;
  END IF;

  -- 1. Accueil standard — neutre et rassurante
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Accueil standard',
    'tts',
    'Intro polyvalente, ton professionnel et bienveillant. Convient à la majorité des postes.',
    'Bonjour et bienvenue. Je suis votre interlocutrice pour ce premier échange. Cet entretien dure environ quinze minutes et se déroule en toute autonomie : je vais vous poser quelques questions, vous prendrez le temps d''y répondre à l''oral, puis nous passerons à la suivante. Il n''y a pas de bonne ou de mauvaise réponse, soyez simplement vous-même. Prenez une grande inspiration, et quand vous êtes prêt, nous commençons.',
    NULL
  );

  -- 2. Accueil chaleureux — startup / culture décontractée
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Accueil chaleureux',
    'tts',
    'Ton plus direct et convivial, adapté aux entreprises avec une culture informelle.',
    'Salut, et merci d''avoir pris le temps de nous rejoindre. On va faire connaissance pendant une quinzaine de minutes à travers quelques questions. L''idée n''est pas de vous piéger, mais de mieux comprendre votre parcours, ce qui vous anime, et la façon dont vous abordez les choses. Répondez naturellement, comme si nous discutions autour d''un café. Quand vous êtes prêt, on y va.',
    NULL
  );

  -- 3. Accueil poste cadre
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Accueil poste cadre',
    'tts',
    'Ton posé et structurant, adapté aux fonctions managériales ou d''expertise.',
    'Bonjour, et merci pour l''intérêt que vous portez à ce poste. Cet entretien constitue la première étape de notre processus de sélection. Pendant une vingtaine de minutes, je vais vous poser plusieurs questions portant sur votre parcours, votre vision du métier et votre manière d''aborder certaines situations professionnelles. Prenez le temps de structurer vos réponses, illustrez-les par des exemples concrets quand cela vous semble pertinent. Quand vous êtes prêt, nous pouvons débuter.',
    NULL
  );

  -- 4. Accueil jeune candidat
  INSERT INTO public.intro_templates (organization_id, created_by, name, type, description, intro_text, tts_voice_id)
  VALUES (
    _org_id, _created_by,
    'Accueil jeune candidat',
    'tts',
    'Ton encourageant et pédagogique, pensé pour les profils juniors qui découvrent souvent ce format.',
    'Bonjour, et bienvenue dans cet entretien. C''est peut-être la première fois que vous passez ce type d''échange avec une intelligence artificielle, alors quelques mots pour vous mettre à l''aise. Je vais vous poser plusieurs questions, une par une. Vous prenez le temps de réfléchir, puis vous répondez à l''oral, sans pression. Personne ne vous écoute en direct : vos réponses seront analysées plus tard par l''équipe de recrutement. Soyez naturel, sincère, et n''hésitez pas à donner des exemples tirés de vos études, de vos stages ou de vos expériences personnelles. Quand vous êtes prêt, nous commençons.',
    NULL
  );
END;
$$;

-- 2. Mettre à jour le trigger pour seeder aussi les intros
CREATE OR REPLACE FUNCTION public.trg_seed_org_question_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _creator uuid;
BEGIN
  _creator := COALESCE(NEW.owner_id, auth.uid());

  IF _creator IS NULL THEN
    SELECT user_id INTO _creator
    FROM public.user_roles
    WHERE role = 'super_admin'::app_role
    ORDER BY id
    LIMIT 1;
  END IF;

  IF _creator IS NOT NULL THEN
    PERFORM public.seed_default_question_templates(NEW.id, _creator);
    PERFORM public.seed_default_criteria_templates(NEW.id, _creator);
    PERFORM public.seed_default_interview_templates(NEW.id, _creator);
    PERFORM public.seed_default_intro_templates(NEW.id, _creator);

    IF NEW.owner_id IS NULL OR _creator = NEW.owner_id THEN
      PERFORM public.seed_demo_project(NEW.id, _creator);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Backfill : seeder les intros pour toutes les organisations existantes qui n'en ont pas
DO $$
DECLARE
  _org RECORD;
  _creator uuid;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations LOOP
    -- Skip si déjà des intros
    IF EXISTS (SELECT 1 FROM public.intro_templates WHERE organization_id = _org.id) THEN
      CONTINUE;
    END IF;

    -- Choisir un créateur : owner > premier admin de l'org > premier super_admin
    _creator := _org.owner_id;

    IF _creator IS NULL THEN
      SELECT user_id INTO _creator
      FROM public.user_roles
      WHERE organization_id = _org.id AND role = 'admin'::app_role
      ORDER BY id LIMIT 1;
    END IF;

    IF _creator IS NULL THEN
      SELECT user_id INTO _creator
      FROM public.user_roles
      WHERE role = 'super_admin'::app_role
      ORDER BY id LIMIT 1;
    END IF;

    IF _creator IS NOT NULL THEN
      PERFORM public.seed_default_intro_templates(_org.id, _creator);
    END IF;
  END LOOP;
END $$;