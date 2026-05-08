-- 1. Table organization_members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org ON public.organization_members(organization_id);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own memberships"
ON public.organization_members FOR SELECT TO authenticated
USING (user_id = auth.uid() OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins manage memberships"
ON public.organization_members FOR ALL TO authenticated
USING (is_org_admin(auth.uid(), organization_id) OR is_super_admin(auth.uid()))
WITH CHECK (is_org_admin(auth.uid(), organization_id) OR is_super_admin(auth.uid()));

-- 2. Backfill depuis profiles
INSERT INTO public.organization_members (user_id, organization_id)
SELECT user_id, organization_id
FROM public.profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- 3. RPC switch_active_organization
CREATE OR REPLACE FUNCTION public.switch_active_organization(_org_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_member boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = _org_id
  ) INTO _is_member;

  IF NOT _is_member AND NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  UPDATE public.profiles SET organization_id = _org_id WHERE user_id = auth.uid();
  RETURN _org_id;
END;
$$;

-- 4. accept_invitation : ajoute appartenance, ne change l'org active que si vide
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

  -- Enregistre l'appartenance (idempotent)
  INSERT INTO public.organization_members (user_id, organization_id)
  VALUES (_user_id, _org_id)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  SELECT organization_id INTO _current_org_in_profile
  FROM public.profiles WHERE user_id = _user_id;

  -- Ne définit l'org active que si l'utilisateur n'en a pas déjà une
  IF _current_org_in_profile IS NULL THEN
    UPDATE public.profiles SET organization_id = _org_id WHERE user_id = _user_id;
  END IF;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _org_id;

  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _org_id;
    _became_owner := true;
  END IF;

  IF _became_owner THEN
    PERFORM public.seed_demo_project(_org_id, _user_id);
  END IF;
END;
$function$;

-- 5. Garde-fou : empêcher l'invitation si déjà membre de cette org
CREATE OR REPLACE FUNCTION public.prevent_duplicate_org_invitation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _existing_user_id uuid;
BEGIN
  SELECT p.user_id INTO _existing_user_id
  FROM public.profiles p
  WHERE lower(p.email) = lower(NEW.email)
  LIMIT 1;

  IF _existing_user_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _existing_user_id AND organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'Cet utilisateur est déjà membre de cette organisation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_org_invitation ON public.organization_invitations;
CREATE TRIGGER trg_prevent_duplicate_org_invitation
BEFORE INSERT ON public.organization_invitations
FOR EACH ROW EXECUTE FUNCTION public.prevent_duplicate_org_invitation();