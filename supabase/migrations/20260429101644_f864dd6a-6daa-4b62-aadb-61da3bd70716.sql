ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS avatar_image_url TEXT;
ALTER TABLE public.interview_template_questions ADD COLUMN IF NOT EXISTS avatar_image_url TEXT;
ALTER TABLE public.question_templates ADD COLUMN IF NOT EXISTS avatar_image_url TEXT;