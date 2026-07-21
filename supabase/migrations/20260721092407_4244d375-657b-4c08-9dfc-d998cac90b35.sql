ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS recovered_at timestamptz;
COMMENT ON COLUMN public.sessions.recovered_at IS 'Set when the session was salvaged post-cancellation by finalize-abandoned-session. NULL for nominal completions.';
CREATE INDEX IF NOT EXISTS idx_sessions_recovered_at ON public.sessions (recovered_at) WHERE recovered_at IS NOT NULL;