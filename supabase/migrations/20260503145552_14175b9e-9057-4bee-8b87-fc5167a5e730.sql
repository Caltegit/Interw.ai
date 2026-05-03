UPDATE public.questions SET follow_up_enabled=false, max_follow_ups=0, relance_level='light';
ALTER TABLE public.questions
  ALTER COLUMN follow_up_enabled SET DEFAULT false,
  ALTER COLUMN max_follow_ups SET DEFAULT 0,
  ALTER COLUMN relance_level SET DEFAULT 'light';

UPDATE public.question_templates SET follow_up_enabled=false, max_follow_ups=0, relance_level='light';
ALTER TABLE public.question_templates
  ALTER COLUMN follow_up_enabled SET DEFAULT false,
  ALTER COLUMN max_follow_ups SET DEFAULT 0,
  ALTER COLUMN relance_level SET DEFAULT 'light';

UPDATE public.interview_template_questions SET follow_up_enabled=false, max_follow_ups=0, relance_level='light';
ALTER TABLE public.interview_template_questions
  ALTER COLUMN follow_up_enabled SET DEFAULT false,
  ALTER COLUMN max_follow_ups SET DEFAULT 0,
  ALTER COLUMN relance_level SET DEFAULT 'light';