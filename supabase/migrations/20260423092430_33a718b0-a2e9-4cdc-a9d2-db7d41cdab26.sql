-- Supprime un éventuel job précédent pour rester idempotent
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-abandoned-sessions-hourly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-abandoned-sessions-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qxszgsxdktnwqabsdfvw.supabase.co/functions/v1/cleanup-abandoned-sessions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c3pnc3hka3Rud3FhYnNkZnZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2Njk3NTIsImV4cCI6MjA5MTI0NTc1Mn0.XBZ_DR9I6yX2O2w4CXzXpl1mSTgtRALs6i0EPlUBzQA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);