alter table public.questions add column if not exists criteria_weights jsonb;
alter table public.interview_template_questions add column if not exists criteria_weights jsonb;