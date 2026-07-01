
-- 1. Refonte du trigger handle_new_user :
--    - À l'INSERT : crée uniquement le profil, et n'auto-link à une invitation que si
--      l'email est déjà confirmé (cas SSO/OAuth où confirmation et création sont simultanées).
--      Cela empêche l'auto-link lorsqu'un compte est créé par un appel admin d'invitation
--      (auth.admin.inviteUserByEmail) — la ligne auth.users apparaît alors avec
--      email_confirmed_at NULL, donc aucun rattachement ne se fait.
--    - Un nouveau trigger AFTER UPDATE se déclenche quand email_confirmed_at passe de NULL
--      à NOT NULL (première confirmation réelle par l'utilisateur) et effectue le rattachement.

CREATE OR REPLACE FUNCTION public.link_pending_invitation(_user_id uuid, _email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _inv_id uuid;
  _inv_org uuid;
  _current_owner uuid;
  _became_owner boolean := false;
BEGIN
  SELECT id, organization_id
    INTO _inv_id, _inv_org
  FROM public.organization_invitations
  WHERE lower(email) = lower(COALESCE(_email, ''))
    AND status = 'pending'::invitation_status
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _inv_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.organization_invitations
     SET status = 'accepted'::invitation_status
   WHERE id = _inv_id;

  INSERT INTO public.organization_members (user_id, organization_id)
  VALUES (_user_id, _inv_org)
  ON CONFLICT (user_id, organization_id) DO NOTHING;

  UPDATE public.profiles
     SET organization_id = _inv_org
   WHERE user_id = _user_id
     AND organization_id IS NULL;

  SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _inv_org;
  IF _current_owner IS NULL THEN
    UPDATE public.organizations SET owner_id = _user_id WHERE id = _inv_org;
    _became_owner := true;
  END IF;

  IF _became_owner THEN
    PERFORM public.seed_demo_project(_inv_org, _user_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '')
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Rattachement immédiat uniquement si email déjà confirmé (SSO/OAuth).
  IF NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.link_pending_invitation(NEW.id, NEW.email);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    PERFORM public.link_pending_invitation(NEW.id, NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 2. Nettoyage complet d'Eva (nouveau compte fantôme créé par inviteUserByEmail)
DELETE FROM public.organization_invitations WHERE lower(email) = 'eva@alboteam.com';
DELETE FROM public.organization_members WHERE user_id = 'd4dbd7e9-8af2-4429-b723-b73d7ca36927';
DELETE FROM public.profiles WHERE user_id = 'd4dbd7e9-8af2-4429-b723-b73d7ca36927';
DELETE FROM auth.users WHERE id = 'd4dbd7e9-8af2-4429-b723-b73d7ca36927';
