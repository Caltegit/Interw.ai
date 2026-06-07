
-- 1. Flag
ALTER TABLE public.interview_templates
  ADD COLUMN IF NOT EXISTS clone_to_new_orgs boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interview_templates_starred
  ON public.interview_templates (clone_to_new_orgs)
  WHERE clone_to_new_orgs = true;

-- 2. Policy: super-admin peut update n'importe quel template (pour pouvoir étoiler hors de son org)
DROP POLICY IF EXISTS "Super admin can update any interview template" ON public.interview_templates;
CREATE POLICY "Super admin can update any interview template"
  ON public.interview_templates FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

-- Permettre aussi la lecture cross-org pour le super-admin (utile pour le picker et le seed côté UI)
DROP POLICY IF EXISTS "Super admin can read any interview template" ON public.interview_templates;
CREATE POLICY "Super admin can read any interview template"
  ON public.interview_templates FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- 3. Nouvelle fonction de seed à partir des templates étoilés
CREATE OR REPLACE FUNCTION public.seed_starred_templates_into_org(
  _org_id uuid, _created_by uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tpl RECORD;
  _new_project_id uuid;
  _crit RECORD;
  _q RECORD;
BEGIN
  IF _org_id IS NULL OR _created_by IS NULL THEN
    RETURN;
  END IF;

  FOR _tpl IN
    SELECT * FROM public.interview_templates
    WHERE clone_to_new_orgs = true
    ORDER BY created_at
  LOOP
    -- Skip doublon par titre
    IF EXISTS (
      SELECT 1 FROM public.projects
      WHERE organization_id = _org_id AND title = _tpl.name
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.projects (
      organization_id, created_by, title, job_title,
      avatar_image_url, ai_voice, ai_persona_name, language,
      max_duration_minutes, record_audio, record_video, status, slug,
      presentation_video_url, intro_audio_url, auto_skip_silence, completion_message, allow_pause,
      tts_provider, tts_voice_id, tts_voice_gender,
      intro_enabled, intro_mode, intro_text, pre_session_message,
      ai_intro_enabled, ai_question_transitions_enabled,
      ai_intro_mode, ai_intro_custom_text,
      ai_question_transitions_mode, ai_question_transitions_custom_text,
      allow_skip_question, intro_first_screen, audio_analysis_enabled, show_question_timer,
      report_recipient_user_ids, visible_to_user_ids,
      candidate_fields, candidate_email_subject, candidate_email_body
    ) VALUES (
      _org_id, _created_by, _tpl.name, _tpl.job_title,
      _tpl.avatar_image_url, _tpl.ai_voice, _tpl.ai_persona_name, _tpl.default_language,
      _tpl.default_duration_minutes, _tpl.record_audio, _tpl.record_video, 'active'::project_status,
      lower(regexp_replace(_tpl.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text || _org_id::text), 1, 8),
      _tpl.presentation_video_url, _tpl.intro_audio_url, _tpl.auto_skip_silence, _tpl.completion_message, _tpl.allow_pause,
      _tpl.tts_provider, _tpl.tts_voice_id, _tpl.tts_voice_gender,
      _tpl.intro_enabled, _tpl.intro_mode, _tpl.intro_text, _tpl.pre_session_message,
      _tpl.ai_intro_enabled, _tpl.ai_question_transitions_enabled,
      _tpl.ai_intro_mode, _tpl.ai_intro_custom_text,
      _tpl.ai_question_transitions_mode, _tpl.ai_question_transitions_custom_text,
      _tpl.allow_skip_question, _tpl.intro_first_screen, _tpl.audio_analysis_enabled, _tpl.show_question_timer,
      ARRAY[]::uuid[], ARRAY[]::uuid[],
      _tpl.candidate_fields, _tpl.candidate_email_subject, _tpl.candidate_email_body
    ) RETURNING id INTO _new_project_id;

    -- Critères
    FOR _crit IN
      SELECT * FROM public.interview_template_criteria
      WHERE template_id = _tpl.id ORDER BY order_index
    LOOP
      INSERT INTO public.evaluation_criteria (
        project_id, order_index, label, description, weight, scoring_scale, anchors, applies_to
      ) VALUES (
        _new_project_id, _crit.order_index, _crit.label, _crit.description,
        _crit.weight, _crit.scoring_scale, _crit.anchors, _crit.applies_to
      );
    END LOOP;

    -- Questions (type template = format de réponse, on retombe sur 'open' dans questions)
    FOR _q IN
      SELECT * FROM public.interview_template_questions
      WHERE template_id = _tpl.id ORDER BY order_index
    LOOP
      INSERT INTO public.questions (
        project_id, order_index, title, content, type,
        audio_url, video_url, follow_up_enabled, max_follow_ups,
        relance_level, hint_text, max_response_seconds, avatar_image_url
      ) VALUES (
        _new_project_id, _q.order_index, _q.title, _q.content, 'open'::question_type,
        _q.audio_url, _q.video_url, _q.follow_up_enabled, _q.max_follow_ups,
        _q.relance_level, _q.hint_text, _q.max_response_seconds, _q.avatar_image_url
      );
    END LOOP;
  END LOOP;
END;
$function$;

-- 4. Mise à jour du trigger
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
    PERFORM public.seed_starred_templates_into_org(NEW.id, NEW.owner_id);
  END IF;
  RETURN NEW;
END;
$function$;
