ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS abandon_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sessions_abandon_reminder_pending
  ON public.sessions (last_activity_at, created_at)
  WHERE abandon_reminder_sent_at IS NULL
    AND status IN ('pending', 'in_progress');

DO $$
BEGIN
  PERFORM cron.unschedule('send-abandon-reminders-every-5min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'send-abandon-reminders-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/send-abandon-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3pnc3hka3Rud3FhYnNkZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Njk3NTIsImV4cCI6MjA5MTI0NTc1Mn0.XBZ_DR9I6yX2O2w4CXzXpl1mSTgtRALs6i0EPlUBzQA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);