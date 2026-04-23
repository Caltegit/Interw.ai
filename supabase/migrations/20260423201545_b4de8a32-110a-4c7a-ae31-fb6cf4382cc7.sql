
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS session_credits_unlimited boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS session_credits_total integer;

CREATE OR REPLACE FUNCTION public.validate_org_session_credits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.session_credits_total IS NOT NULL AND NEW.session_credits_total < 0 THEN
    RAISE EXCEPTION 'session_credits_total doit être positif ou nul';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_org_session_credits ON public.organizations;
CREATE TRIGGER trg_validate_org_session_credits
BEFORE INSERT OR UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.validate_org_session_credits();
