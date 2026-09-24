ALTER TABLE public.questions
  ADD COLUMN is_interw_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN interw_profile_question_key text;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_interw_profile_question_key_check
  CHECK (interw_profile_question_key IS NULL OR interw_profile_question_key IN ('act_and_lead', 'solve_and_decide', 'adapt_and_learn'));

ALTER TABLE public.questions
  ADD CONSTRAINT questions_interw_profile_marker_check
  CHECK ((is_interw_profile AND interw_profile_question_key IS NOT NULL) OR (NOT is_interw_profile AND interw_profile_question_key IS NULL));

ALTER TABLE public.interview_template_questions
  ADD COLUMN is_interw_profile boolean NOT NULL DEFAULT false,
  ADD COLUMN interw_profile_question_key text;

ALTER TABLE public.interview_template_questions
  ADD CONSTRAINT interview_template_questions_interw_profile_question_key_check
  CHECK (interw_profile_question_key IS NULL OR interw_profile_question_key IN ('act_and_lead', 'solve_and_decide', 'adapt_and_learn'));

ALTER TABLE public.interview_template_questions
  ADD CONSTRAINT interview_template_questions_interw_profile_marker_check
  CHECK ((is_interw_profile AND interw_profile_question_key IS NOT NULL) OR (NOT is_interw_profile AND interw_profile_question_key IS NULL));

CREATE INDEX questions_interw_profile_lookup_idx
  ON public.questions (project_id, is_interw_profile)
  WHERE is_interw_profile = true;