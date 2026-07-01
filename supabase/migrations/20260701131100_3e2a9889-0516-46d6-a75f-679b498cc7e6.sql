
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
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
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, '')
  );

  -- Auto-attach à l'organisation si une invitation en cours existe pour cet email
  SELECT id, organization_id
    INTO _inv_id, _inv_org
  FROM public.organization_invitations
  WHERE lower(email) = lower(COALESCE(NEW.email, ''))
    AND status = 'pending'::invitation_status
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF _inv_id IS NOT NULL THEN
    UPDATE public.organization_invitations
       SET status = 'accepted'::invitation_status
     WHERE id = _inv_id;

    INSERT INTO public.organization_members (user_id, organization_id)
    VALUES (NEW.id, _inv_org)
    ON CONFLICT (user_id, organization_id) DO NOTHING;

    UPDATE public.profiles
       SET organization_id = _inv_org
     WHERE user_id = NEW.id
       AND organization_id IS NULL;

    SELECT owner_id INTO _current_owner FROM public.organizations WHERE id = _inv_org;
    IF _current_owner IS NULL THEN
      UPDATE public.organizations SET owner_id = NEW.id WHERE id = _inv_org;
      _became_owner := true;
    END IF;

    IF _became_owner THEN
      PERFORM public.seed_demo_project(_inv_org, NEW.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
