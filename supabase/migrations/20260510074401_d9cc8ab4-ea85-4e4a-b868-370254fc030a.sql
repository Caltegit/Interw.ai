UPDATE public.sessions s
SET recruiter_note = r.recruiter_notes
FROM public.reports r
WHERE r.session_id = s.id
  AND r.recruiter_notes IS NOT NULL
  AND r.recruiter_notes <> ''
  AND (s.recruiter_note IS NULL OR s.recruiter_note = '');

ALTER TABLE public.reports DROP COLUMN IF EXISTS recruiter_notes;