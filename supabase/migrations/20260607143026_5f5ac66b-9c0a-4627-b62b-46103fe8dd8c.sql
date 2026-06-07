CREATE OR REPLACE FUNCTION public.trg_seed_org_question_templates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _creator uuid;
BEGIN
  _creator := COALESCE(NEW.owner_id, auth.uid());

  IF _creator IS NULL THEN
    SELECT user_id INTO _creator
    FROM public.user_roles
    WHERE role = 'super_admin'::app_role
    ORDER BY id
    LIMIT 1;
  END IF;

  IF _creator IS NOT NULL THEN
    PERFORM public.seed_default_question_templates(NEW.id, _creator);
    PERFORM public.seed_default_criteria_templates(NEW.id, _creator);
    PERFORM public.seed_default_interview_templates(NEW.id, _creator);
    PERFORM public.seed_default_intro_templates(NEW.id, _creator);

    -- Clone des sessions types étoilées (remplace l'ancien seed_demo_project)
    IF NEW.owner_id IS NOT NULL AND _creator = NEW.owner_id THEN
      PERFORM public.seed_starred_templates_into_org(NEW.id, _creator);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;