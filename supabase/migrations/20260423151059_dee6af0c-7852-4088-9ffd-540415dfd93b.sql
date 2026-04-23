-- 1. Réparer les projets démo orphelins
UPDATE public.projects p
SET created_by = o.owner_id
FROM public.organizations o
WHERE p.organization_id = o.id
  AND p.title = 'Candidature spontanée - TEST -'
  AND o.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.user_id = p.created_by
      AND pr.organization_id = p.organization_id
  );

-- 2. Nouvelle policy : les membres de l'org peuvent voir tous les projets de leur org
CREATE POLICY "Org members can view org projects"
ON public.projects FOR SELECT TO authenticated
USING (organization_id = public.get_user_organization_id(auth.uid()));

-- 3. Empêcher la récidive : ne pas seeder le projet démo quand auth.uid() n'est pas le futur owner
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

  -- Fallback: si pas de contexte auth (service role), prendre le premier super_admin
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

    -- Ne seeder le projet démo que si le créateur est bien le futur owner
    -- (sinon accept_invitation s'en chargera avec le bon utilisateur)
    IF NEW.owner_id IS NULL OR _creator = NEW.owner_id THEN
      PERFORM public.seed_demo_project(NEW.id, _creator);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;