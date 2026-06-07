
CREATE OR REPLACE FUNCTION public.clone_template_project_into_org(_org_id uuid, _created_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _template_id constant uuid := '3519629b-8906-477f-91e7-fc6f12ffa0d2';
  _src public.projects%ROWTYPE;
  _new_project_id uuid;
  _crit record;
  _q record;
  _crit_map jsonb := '{}'::jsonb;
  _new_crit_id uuid;
  _remapped uuid[];
  _old_id uuid;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _src FROM public.projects WHERE id = _template_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects
    WHERE organization_id = _org_id AND title = _src.title
  ) THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.projects (
    organization_id, created_by, title, job_title,
    presentation_video_url, avatar_image_url, ai_voice, ai_persona_name, language,
    max_duration_minutes, record_audio, record_video, status, slug,
    expires_at, intro_audio_url, auto_skip_silence, completion_message, allow_pause,
    tts_provider, tts_voice_id, tts_voice_gender, intro_enabled, intro_mode, intro_text,
    pre_session_message, ai_intro_enabled, ai_question_transitions_enabled,
    ai_intro_mode, ai_intro_custom_text, ai_question_transitions_mode, ai_question_transitions_custom_text,
    allow_skip_question, intro_first_screen, audio_analysis_enabled, show_question_timer,
    report_recipient_user_ids, visible_to_user_ids,
    candidate_fields, candidate_email_subject, candidate_email_body
  ) VALUES (
    _org_id, _created_by, _src.title, _src.job_title,
    _src.presentation_video_url, _src.avatar_image_url, _src.ai_voice, _src.ai_persona_name, _src.language,
    _src.max_duration_minutes, _src.record_audio, _src.record_video, _src.status,
    'votre-premier-entretien-' || substr(md5(random()::text || _org_id::text), 1, 8),
    NULL, _src.intro_audio_url, _src.auto_skip_silence, _src.completion_message, _src.allow_pause,
    _src.tts_provider, _src.tts_voice_id, _src.tts_voice_gender, _src.intro_enabled, _src.intro_mode, _src.intro_text,
    _src.pre_session_message, _src.ai_intro_enabled, _src.ai_question_transitions_enabled,
    _src.ai_intro_mode, _src.ai_intro_custom_text, _src.ai_question_transitions_mode, _src.ai_question_transitions_custom_text,
    _src.allow_skip_question, _src.intro_first_screen, _src.audio_analysis_enabled, _src.show_question_timer,
    ARRAY[]::uuid[], ARRAY[]::uuid[],
    _src.candidate_fields, _src.candidate_email_subject, _src.candidate_email_body
  ) RETURNING id INTO _new_project_id;

  FOR _crit IN
    SELECT * FROM public.evaluation_criteria WHERE project_id = _template_id ORDER BY order_index
  LOOP
    INSERT INTO public.evaluation_criteria (
      project_id, order_index, label, description, weight, scoring_scale, anchors, applies_to
    ) VALUES (
      _new_project_id, _crit.order_index, _crit.label, _crit.description,
      _crit.weight, _crit.scoring_scale, _crit.anchors, _crit.applies_to
    ) RETURNING id INTO _new_crit_id;
    _crit_map := _crit_map || jsonb_build_object(_crit.id::text, _new_crit_id::text);
  END LOOP;

  FOR _q IN
    SELECT * FROM public.questions WHERE project_id = _template_id ORDER BY order_index
  LOOP
    _remapped := NULL;
    IF _q.scoring_criteria_ids IS NOT NULL AND array_length(_q.scoring_criteria_ids, 1) > 0 THEN
      _remapped := ARRAY[]::uuid[];
      FOREACH _old_id IN ARRAY _q.scoring_criteria_ids LOOP
        IF _crit_map ? _old_id::text THEN
          _remapped := _remapped || ((_crit_map ->> _old_id::text)::uuid);
        END IF;
      END LOOP;
    END IF;

    INSERT INTO public.questions (
      project_id, order_index, content, type, follow_up_enabled, max_follow_ups,
      scoring_criteria_ids, audio_url, video_url, title, relance_level,
      hint_text, max_response_seconds, avatar_image_url
    ) VALUES (
      _new_project_id, _q.order_index, _q.content, _q.type, _q.follow_up_enabled, _q.max_follow_ups,
      _remapped, _q.audio_url, _q.video_url, _q.title, _q.relance_level,
      _q.hint_text, _q.max_response_seconds, _q.avatar_image_url
    );
  END LOOP;

  RETURN _new_project_id;
END
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
    PERFORM public.clone_template_project_into_org(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$function$;

DO $$
DECLARE
  _template_id constant uuid := '3519629b-8906-477f-91e7-fc6f12ffa0d2';
  _src_org uuid;
  _o record;
BEGIN
  SELECT organization_id INTO _src_org FROM public.projects WHERE id = _template_id;
  FOR _o IN
    SELECT id, owner_id FROM public.organizations
    WHERE owner_id IS NOT NULL
      AND (id IS DISTINCT FROM _src_org)
  LOOP
    PERFORM public.clone_template_project_into_org(_o.id, _o.owner_id);
  END LOOP;
END $$;
