-- 1. Drop duplicate trigger
DROP TRIGGER IF EXISTS trg_seed_org_after_insert ON public.organizations;

-- 2. Rewrite seed trigger function to no longer create the demo project when the org has no owner.
-- The demo project is now created exclusively by trg_seed_on_owner_set when a real owner is attached.
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

    -- Demo project only when the org is created with its real owner already set
    -- (e.g. legacy flows). Otherwise it will be seeded by trg_seed_on_owner_set.
    IF NEW.owner_id IS NOT NULL AND _creator = NEW.owner_id THEN
      PERFORM public.seed_demo_project(NEW.id, _creator);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Cleanup: reassign created_by of existing demo projects whose org owner differs from the
-- super admin who originally seeded them. Keeps the super admin's own demo intact.
UPDATE public.projects p
SET created_by = o.owner_id
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.title = 'Candidature spontanée - TEST -'
  AND o.owner_id IS NOT NULL
  AND o.owner_id <> p.created_by;