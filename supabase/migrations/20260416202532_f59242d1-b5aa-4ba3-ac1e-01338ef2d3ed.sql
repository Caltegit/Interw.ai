CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
  _current_owner uuid;
  _assigned_role app_role;
BEGIN
  SELECT id, organization_id INTO _invitation_id, _org_id
  FROM public.organization_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;

  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;

  -- Si l'organisation n'a pas encore d'owner, l'invité devient owner + admin
  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _assigned_role := 'admin'::app_role;
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, _assigned_role, _org_id)
  ON CONFLICT DO NOTHING;
END;
$function$;