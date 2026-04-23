
-- 1. Rendre accept_invitation idempotente
CREATE OR REPLACE FUNCTION public.accept_invitation(_token text, _user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _org_id uuid;
  _invitation_id uuid;
  _invitation_status invitation_status;
  _current_owner uuid;
  _current_org_in_profile uuid;
  _assigned_role app_role;
  _has_any_role boolean;
BEGIN
  -- Charger l'invitation (acceptée OU pending, mais pas expirée)
  SELECT id, organization_id, status
    INTO _invitation_id, _org_id, _invitation_status
  FROM public.organization_invitations
  WHERE token = _token AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Marquer acceptée si pas déjà fait
  IF _invitation_status <> 'accepted'::invitation_status THEN
    UPDATE public.organization_invitations
    SET status = 'accepted'
    WHERE id = _invitation_id;
  END IF;

  -- Rattacher le profil si pas déjà fait
  SELECT organization_id INTO _current_org_in_profile
  FROM public.profiles WHERE user_id = _user_id;

  IF _current_org_in_profile IS NULL OR _current_org_in_profile <> _org_id THEN
    UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;
  END IF;

  -- Owner : positionner si manquant
  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _assigned_role := 'admin'::app_role;
  ELSIF _current_owner = _user_id THEN
    _assigned_role := 'admin'::app_role;
  ELSE
    _assigned_role := 'recruiter'::app_role;
  END IF;

  -- Vérifier si le user a déjà un rôle dans cette org
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND organization_id = _org_id
  ) INTO _has_any_role;

  IF NOT _has_any_role THEN
    INSERT INTO public.user_roles (user_id, role, organization_id)
    VALUES (_user_id, _assigned_role, _org_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$function$;

-- 2. Réparer les orgs existantes sans owner (en utilisant l'admin rattaché)
UPDATE public.organizations o
SET owner_id = sub.user_id
FROM (
  SELECT DISTINCT ON (p.organization_id) p.organization_id, p.user_id
  FROM public.profiles p
  JOIN public.user_roles ur
    ON ur.user_id = p.user_id
   AND ur.organization_id = p.organization_id
   AND ur.role = 'admin'::app_role
  ORDER BY p.organization_id, p.created_at
) sub
WHERE o.owner_id IS NULL
  AND o.id = sub.organization_id;

-- 3. Marquer comme acceptées les invitations dont le destinataire est déjà rattaché
UPDATE public.organization_invitations oi
SET status = 'accepted'::invitation_status
WHERE status = 'pending'::invitation_status
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.email) = lower(oi.email)
      AND p.organization_id = oi.organization_id
  );
