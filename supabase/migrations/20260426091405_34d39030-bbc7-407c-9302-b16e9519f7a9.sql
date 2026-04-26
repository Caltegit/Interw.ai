ALTER TABLE public.projects
  ADD COLUMN ai_intro_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN ai_question_transitions_enabled boolean NOT NULL DEFAULT true;

UPDATE public.projects
SET ai_intro_enabled = ai_transitions_enabled,
    ai_question_transitions_enabled = ai_transitions_enabled;

ALTER TABLE public.projects DROP COLUMN ai_transitions_enabled;