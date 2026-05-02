-- Add columns to track Gemini-based transcription
ALTER TABLE public.session_messages
  ADD COLUMN IF NOT EXISTS content_raw text,
  ADD COLUMN IF NOT EXISTS transcription_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transcribed_at timestamptz;

-- Mark existing rows as 'raw' so they can be re-transcribed on demand
UPDATE public.session_messages
SET transcription_status = 'raw'
WHERE transcription_status = 'pending'
  AND role = 'candidate';

-- Constrain allowed values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'session_messages_transcription_status_check'
  ) THEN
    ALTER TABLE public.session_messages
      ADD CONSTRAINT session_messages_transcription_status_check
      CHECK (transcription_status IN ('pending','processing','done','failed','raw','skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_messages_transcription_status
  ON public.session_messages(session_id, transcription_status);