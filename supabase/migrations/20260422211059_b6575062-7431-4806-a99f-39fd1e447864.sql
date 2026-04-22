-- 1. Replace the AFTER INSERT trigger function on organizations to seed everything
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

  -- Fallback: if no auth context (e.g. service role), use the first super_admin available
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
    PERFORM public.seed_demo_project(NEW.id, _creator);
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Make sure the AFTER INSERT trigger exists and points to this function
DROP TRIGGER IF EXISTS trg_seed_org_question_templates ON public.organizations;
DROP TRIGGER IF EXISTS seed_default_question_templates_trigger ON public.organizations;

CREATE TRIGGER trg_seed_org_after_insert
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.trg_seed_org_question_templates();

-- 3. Backfill: for every existing organization missing the demo project or interview templates,
--    run the full seed using the first available super_admin as technical creator.
DO $$
DECLARE
  _admin uuid;
  _org RECORD;
BEGIN
  SELECT user_id INTO _admin
  FROM public.user_roles
  WHERE role = 'super_admin'::app_role
  ORDER BY id
  LIMIT 1;

  IF _admin IS NULL THEN
    RAISE NOTICE 'No super_admin found, skipping backfill';
    RETURN;
  END IF;

  FOR _org IN
    SELECT o.id
    FROM public.organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.organization_id = o.id
        AND p.title = 'Candidature spontanée - TEST -'
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.interview_templates it
      WHERE it.organization_id = o.id
    )
  LOOP
    PERFORM public.seed_default_question_templates(_org.id, _admin);
    PERFORM public.seed_default_criteria_templates(_org.id, _admin);
    PERFORM public.seed_default_interview_templates(_org.id, _admin);
    PERFORM public.seed_demo_project(_org.id, _admin);
  END LOOP;
END;
$$;