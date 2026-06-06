
-- 1. Enum
DO $$ BEGIN
  CREATE TYPE public.report_job_status AS ENUM ('queued','processing','done','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Table
CREATE TABLE IF NOT EXISTS public.report_jobs (
  session_id uuid PRIMARY KEY REFERENCES public.sessions(id) ON DELETE CASCADE,
  status public.report_job_status NOT NULL DEFAULT 'queued',
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 6,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_until timestamptz,
  last_error text,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS report_jobs_pickup_idx
  ON public.report_jobs (status, next_attempt_at)
  WHERE status IN ('queued','processing');

CREATE INDEX IF NOT EXISTS report_jobs_org_idx
  ON public.report_jobs (organization_id, status);

-- 3. GRANTS
GRANT SELECT ON public.report_jobs TO authenticated;
GRANT ALL ON public.report_jobs TO service_role;

-- 4. RLS
ALTER TABLE public.report_jobs ENABLE ROW LEVEL SECURITY;

-- Membres de l'org propriétaire peuvent lire
CREATE POLICY "Org members can read report_jobs"
ON public.report_jobs FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Super admin peut updater (retry manuel)
CREATE POLICY "Super admin can update report_jobs"
ON public.report_jobs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- 5. updated_at trigger
CREATE OR REPLACE FUNCTION public.report_jobs_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS report_jobs_updated_at ON public.report_jobs;
CREATE TRIGGER report_jobs_updated_at
BEFORE UPDATE ON public.report_jobs
FOR EACH ROW EXECUTE FUNCTION public.report_jobs_set_updated_at();

-- 6. RPC : enqueue idempotent
CREATE OR REPLACE FUNCTION public.enqueue_report_job(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.sessions WHERE id = p_session_id;
  IF NOT FOUND THEN RETURN; END IF;

  INSERT INTO public.report_jobs (session_id, organization_id, status, next_attempt_at)
  VALUES (p_session_id, v_org, 'queued', now())
  ON CONFLICT (session_id) DO UPDATE
    SET
      status = CASE
        WHEN public.report_jobs.status IN ('done','processing') THEN public.report_jobs.status
        ELSE 'queued'
      END,
      next_attempt_at = LEAST(public.report_jobs.next_attempt_at, now()),
      updated_at = now();
END $$;

GRANT EXECUTE ON FUNCTION public.enqueue_report_job(uuid) TO authenticated, service_role;

-- 7. RPC : claim atomique (worker)
CREATE OR REPLACE FUNCTION public.claim_report_jobs(p_limit int, p_lock_ms int)
RETURNS SETOF public.report_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.report_jobs rj SET
    status = 'processing',
    locked_at = now(),
    locked_until = now() + (p_lock_ms || ' milliseconds')::interval,
    attempts = rj.attempts + 1,
    updated_at = now()
  WHERE rj.session_id IN (
    SELECT inner_rj.session_id FROM public.report_jobs inner_rj
    WHERE inner_rj.status = 'queued'
      AND inner_rj.next_attempt_at <= now()
    ORDER BY inner_rj.next_attempt_at
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  )
  RETURNING rj.*;
END $$;

GRANT EXECUTE ON FUNCTION public.claim_report_jobs(int, int) TO service_role;

-- 8. RPC : requeue les jobs stuck (lock expiré)
CREATE OR REPLACE FUNCTION public.requeue_stuck_report_jobs()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int;
BEGIN
  WITH updated AS (
    UPDATE public.report_jobs SET
      status = CASE WHEN attempts >= max_attempts THEN 'failed'::report_job_status ELSE 'queued'::report_job_status END,
      last_error = COALESCE(last_error, '') || ' [stuck recovery at ' || now()::text || ']',
      locked_until = NULL,
      updated_at = now()
    WHERE status = 'processing' AND locked_until < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.requeue_stuck_report_jobs() TO service_role;

-- 9. RPC : mark done
CREATE OR REPLACE FUNCTION public.mark_report_job_done(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.report_jobs SET
    status = 'done',
    completed_at = now(),
    locked_until = NULL,
    last_error = NULL,
    updated_at = now()
  WHERE session_id = p_session_id;
END $$;

GRANT EXECUTE ON FUNCTION public.mark_report_job_done(uuid) TO service_role;

-- 10. RPC : mark failed with exponential backoff
CREATE OR REPLACE FUNCTION public.mark_report_job_failed(p_session_id uuid, p_error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts int;
  v_max int;
  v_delay interval;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max
  FROM public.report_jobs WHERE session_id = p_session_id;

  -- Backoff : 1m, 5m, 15m, 1h, 4h, 12h
  v_delay := CASE v_attempts
    WHEN 1 THEN interval '1 minute'
    WHEN 2 THEN interval '5 minutes'
    WHEN 3 THEN interval '15 minutes'
    WHEN 4 THEN interval '1 hour'
    WHEN 5 THEN interval '4 hours'
    ELSE interval '12 hours'
  END;

  UPDATE public.report_jobs SET
    status = CASE WHEN v_attempts >= v_max THEN 'failed'::report_job_status ELSE 'queued'::report_job_status END,
    next_attempt_at = now() + v_delay,
    locked_until = NULL,
    last_error = left(coalesce(p_error,''), 2000),
    updated_at = now()
  WHERE session_id = p_session_id;
END $$;

GRANT EXECUTE ON FUNCTION public.mark_report_job_failed(uuid, text) TO service_role;

-- 11. Trigger d'enqueue automatique sur transition vers 'completed'
CREATE OR REPLACE FUNCTION public.trg_enqueue_report_on_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed'
     AND COALESCE(OLD.status::text, '') <> 'completed'
     AND COALESCE(NEW.is_demo, false) = false THEN
    PERFORM public.enqueue_report_job(NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS sessions_enqueue_report ON public.sessions;
CREATE TRIGGER sessions_enqueue_report
AFTER UPDATE OF status ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_enqueue_report_on_completed();
