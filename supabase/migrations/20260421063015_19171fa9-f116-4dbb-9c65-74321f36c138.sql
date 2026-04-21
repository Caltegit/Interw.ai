ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS hint_text text,
  ADD COLUMN IF NOT EXISTS max_response_seconds integer;

ALTER TABLE public.question_templates
  ADD COLUMN IF NOT EXISTS hint_text text,
  ADD COLUMN IF NOT EXISTS max_response_seconds integer;

ALTER TABLE public.interview_template_questions
  ADD COLUMN IF NOT EXISTS hint_text text,
  ADD COLUMN IF NOT EXISTS max_response_seconds integer;