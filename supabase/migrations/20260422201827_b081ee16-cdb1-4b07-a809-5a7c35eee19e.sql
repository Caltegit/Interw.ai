
CREATE OR REPLACE FUNCTION public.seed_demo_project(_org_id uuid, _created_by uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _project_id uuid;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE organization_id = _org_id AND title = 'Candidature spontanée'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.projects (
    organization_id, created_by, title, job_title, description, status, language,
    ai_persona_name, ai_voice, tts_provider, tts_voice_gender, tts_voice_id,
    max_duration_minutes, record_audio, record_video,
    intro_enabled, intro_mode, intro_text,
    completion_message, slug
  ) VALUES (
    _org_id, _created_by, 'Candidature spontanée', 'Candidature spontanée',
    'Projet de démo pré-rempli pour découvrir Interw.ai.',
    'active', 'fr', 'Marie', 'female_fr', 'elevenlabs', 'female', 'XB0fDUnXU5powFXDhCwa',
    30, true, false,
    true, 'tts',
    'Bienvenue dans cette session de test pour comprendre comment fonctionne Interw.ai. Voici le message de bienvenue que vous pouvez customiser. À suivre, 5 questions lues par l''IA.',
    'Merci pour votre temps ! Votre session est terminée.',
    'candidature-spontanee-' || substr(md5(random()::text || _org_id::text), 1, 8)
  ) RETURNING id INTO _project_id;

  INSERT INTO public.questions (project_id, order_index, title, content, type, follow_up_enabled, max_follow_ups, relance_level)
  VALUES
    (_project_id, 0, 'Bien-être', 'Comment ça va aujourd''hui ?', 'open', true, 1, 'light'),
    (_project_id, 1, 'Dernière expérience', 'Parlez-moi de votre dernière expérience professionnelle en quelques minutes. C''est à vous.', 'open', true, 2, 'medium'),
    (_project_id, 2, 'Motivation', 'Pourquoi avoir choisi notre entreprise, qu''est-ce qui vous motive à nous rejoindre ?', 'open', true, 2, 'medium'),
    (_project_id, 3, 'Hors travail', 'Que faites-vous en dehors du travail ? À quoi occupez-vous votre temps libre ?', 'open', true, 1, 'light'),
    (_project_id, 4, 'Mot de la fin', 'Un dernier mot avant qu''on se quitte ?', 'open', true, 1, 'light');
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
  _current_owner uuid;
  _assigned_role app_role;
BEGIN
  SELECT id, organization_id INTO _invitation_id, _org_id
  FROM public.organization_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;
  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _assigned_role := 'admin'::app_role;
    PERFORM public.seed_default_question_templates(_org_id, _user_id);
    PERFORM public.seed_default_criteria_templates(_org_id, _user_id);
    PERFORM public.seed_default_interview_templates(_org_id, _user_id);
    PERFORM public.seed_demo_project(_org_id, _user_id);
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, _assigned_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_seed_on_owner_set()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.owner_id IS NOT NULL AND (OLD.owner_id IS NULL OR OLD.owner_id <> NEW.owner_id) THEN
    PERFORM public.seed_default_question_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_default_criteria_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_default_interview_templates(NEW.id, NEW.owner_id);
    PERFORM public.seed_demo_project(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE _org RECORD;
BEGIN
  FOR _org IN SELECT id, owner_id FROM public.organizations WHERE owner_id IS NOT NULL LOOP
    PERFORM public.seed_demo_project(_org.id, _org.owner_id);
  END LOOP;
END $$;
