
ALTER TABLE public.interview_templates
  ADD COLUMN IF NOT EXISTS ai_persona_name text NOT NULL DEFAULT 'Sophie',
  ADD COLUMN IF NOT EXISTS ai_voice ai_voice_type NOT NULL DEFAULT 'female_fr'::ai_voice_type,
  ADD COLUMN IF NOT EXISTS avatar_image_url text,
  ADD COLUMN IF NOT EXISTS tts_provider text NOT NULL DEFAULT 'browser',
  ADD COLUMN IF NOT EXISTS tts_voice_id text DEFAULT 'XB0fDUnXU5powFXDhCwa',
  ADD COLUMN IF NOT EXISTS tts_voice_gender text NOT NULL DEFAULT 'female',
  ADD COLUMN IF NOT EXISTS intro_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intro_mode text,
  ADD COLUMN IF NOT EXISTS intro_text text,
  ADD COLUMN IF NOT EXISTS intro_audio_url text,
  ADD COLUMN IF NOT EXISTS presentation_video_url text,
  ADD COLUMN IF NOT EXISTS ai_intro_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_intro_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS ai_intro_custom_text text,
  ADD COLUMN IF NOT EXISTS ai_question_transitions_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_question_transitions_mode text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS ai_question_transitions_custom_text text,
  ADD COLUMN IF NOT EXISTS record_audio boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS record_video boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS auto_skip_silence boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_pause boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_skip_question boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS intro_first_screen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audio_analysis_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_question_timer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS completion_message text,
  ADD COLUMN IF NOT EXISTS pre_session_message text,
  ADD COLUMN IF NOT EXISTS candidate_fields jsonb NOT NULL DEFAULT jsonb_build_object(
    'job_title', jsonb_build_object('enabled', false, 'required', false),
    'cv', jsonb_build_object('enabled', false, 'required', false),
    'linkedin', jsonb_build_object('enabled', false, 'required', false),
    'cover_letter', jsonb_build_object('enabled', false, 'required', false)
  ),
  ADD COLUMN IF NOT EXISTS candidate_email_subject text,
  ADD COLUMN IF NOT EXISTS candidate_email_body text;

ALTER TABLE public.interview_templates
  DROP CONSTRAINT IF EXISTS interview_templates_intro_mode_check;
ALTER TABLE public.interview_templates
  ADD CONSTRAINT interview_templates_intro_mode_check
  CHECK (intro_mode IS NULL OR (intro_mode = ANY (ARRAY['text'::text, 'tts'::text, 'audio'::text, 'video'::text])));

ALTER TABLE public.interview_templates
  DROP CONSTRAINT IF EXISTS interview_templates_ai_intro_mode_check;
ALTER TABLE public.interview_templates
  ADD CONSTRAINT interview_templates_ai_intro_mode_check
  CHECK (ai_intro_mode = ANY (ARRAY['auto'::text, 'custom'::text]));

ALTER TABLE public.interview_templates
  DROP CONSTRAINT IF EXISTS interview_templates_ai_question_transitions_mode_check;
ALTER TABLE public.interview_templates
  ADD CONSTRAINT interview_templates_ai_question_transitions_mode_check
  CHECK (ai_question_transitions_mode = ANY (ARRAY['auto'::text, 'custom'::text]));

ALTER TABLE public.interview_templates
  DROP CONSTRAINT IF EXISTS interview_templates_tts_provider_check;
ALTER TABLE public.interview_templates
  ADD CONSTRAINT interview_templates_tts_provider_check
  CHECK (tts_provider = ANY (ARRAY['browser'::text, 'elevenlabs'::text]));

ALTER TABLE public.interview_templates
  DROP CONSTRAINT IF EXISTS interview_templates_tts_voice_gender_check;
ALTER TABLE public.interview_templates
  ADD CONSTRAINT interview_templates_tts_voice_gender_check
  CHECK (tts_voice_gender = ANY (ARRAY['female'::text, 'male'::text]));
