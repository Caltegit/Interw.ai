CREATE OR REPLACE FUNCTION public.set_session_assigned_to()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _creator uuid;
  _owner uuid;
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.created_by, o.owner_id
    INTO _creator, _owner
  FROM public.projects p
  JOIN public.organizations o ON o.id = p.organization_id
  WHERE p.id = NEW.project_id;

  NEW.assigned_to := COALESCE(_creator, _owner);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_session_assigned_to ON public.sessions;
CREATE TRIGGER trg_set_session_assigned_to
BEFORE INSERT ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_session_assigned_to();