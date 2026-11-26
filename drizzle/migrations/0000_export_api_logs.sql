CREATE TABLE public.export_api_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  action text,
  params jsonb,
  status int,
  duration_ms int,
  response_bytes int,
  item_count int,
  ip text,
  user_agent text
);
GRANT ALL ON public.export_api_logs TO service_role;
ALTER TABLE public.export_api_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX export_api_logs_created_at_idx ON public.export_api_logs (created_at DESC);