ALTER TABLE public.projects
  ADD COLUMN ai_intro_mode text NOT NULL DEFAULT 'auto'
    CHECK (ai_intro_mode IN ('auto','custom')),
  ADD COLUMN ai_intro_custom_text text,
  ADD COLUMN ai_question_transitions_mode text NOT NULL DEFAULT 'auto'
    CHECK (ai_question_transitions_mode IN ('auto','custom')),
  ADD COLUMN ai_question_transitions_custom_text text;