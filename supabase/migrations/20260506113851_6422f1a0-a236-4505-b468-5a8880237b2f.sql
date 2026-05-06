-- 1. Ajout colonne assigned_to sur sessions
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_assigned_to ON public.sessions(assigned_to);

-- 2. Backfill : assigner les sessions existantes au créateur du projet (fallback owner de l'org)
UPDATE public.sessions s
SET assigned_to = COALESCE(p.created_by, o.owner_id)
FROM public.projects p
JOIN public.organizations o ON o.id = p.organization_id
WHERE p.id = s.project_id
  AND s.assigned_to IS NULL;

-- 3. Mise à jour is_org_admin : owner OR co-admin existant
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND owner_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
      AND organization_id = _org_id
  )
$function$;

-- 4. accept_invitation : ne crée plus de rôle pour les invités standards.
-- Le premier user à rejoindre devient owner si aucun owner n'existe.
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
  _became_owner boolean := false;
BEGIN
  SELECT id, organization_id, status
    INTO _invitation_id, _org_id, _invitation_status
  FROM public.organization_invitations
  WHERE token = _token AND expires_at > now();

  IF _invitation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  IF _invitation_status <> 'accepted'::invitation_status THEN
    UPDATE public.organization_invitations SET status = 'accepted' WHERE id = _invitation_id;
  END IF;

  SELECT organization_id INTO _current_org_in_profile
  FROM public.profiles WHERE user_id = _user_id;

  IF _current_org_in_profile IS NULL OR _current_org_in_profile <> _org_id THEN
    UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;
  END IF;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _became_owner := true;
  END IF;

  -- Création du projet démo si le user devient owner (premier arrivé)
  IF _became_owner THEN
    PERFORM public.seed_demo_project(_org_id, _user_id);
  END IF;
END;
$function$;

-- 5. Nettoyage rôles obsolètes
DELETE FROM public.user_roles WHERE role IN ('recruiter','viewer');