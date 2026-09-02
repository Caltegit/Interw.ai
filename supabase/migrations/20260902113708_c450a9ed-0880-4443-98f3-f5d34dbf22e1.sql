CREATE OR REPLACE FUNCTION public.create_own_organization(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _org_id uuid;
  _slug text;
  _counter int := 1;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  _name := btrim(_name);
  IF _name = '' THEN
    RAISE EXCEPTION 'Nom d''organisation requis';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND organization_id IS NOT NULL)
     OR EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = _user_id) THEN
    RAISE EXCEPTION 'Organisation déjà existante pour cet utilisateur';
  END IF;

  _slug := public.slugify(_name);
  IF _slug IS NULL OR _slug = '' THEN
    _slug := 'org';
  END IF;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = _slug) LOOP
    _counter := _counter + 1;
    _slug := public.slugify(_name) || '-' || _counter;
    IF _counter > 50 THEN
      RAISE EXCEPTION 'Impossible de générer un identifiant unique';
    END IF;
  END LOOP;

  INSERT INTO public.organizations (name, slug, owner_id, session_credits_unlimited, session_credits_total)
  VALUES (_name, _slug, _user_id, false, 10)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (user_id, organization_id)
  VALUES (_user_id, _org_id)
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
     SET organization_id = _org_id
   WHERE user_id = _user_id;

  INSERT INTO public.user_roles (user_id, role, organization_id)
  VALUES (_user_id, 'admin'::public.app_role, _org_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM public.seed_default_question_templates(_org_id, _user_id);
  PERFORM public.seed_default_criteria_templates(_org_id, _user_id);
  PERFORM public.seed_default_intro_templates(_org_id, _user_id);
  PERFORM public.seed_default_interview_templates(_org_id, _user_id);
  PERFORM public.seed_demo_project(_org_id, _user_id);

  RETURN _org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_own_organization(text) TO authenticated;