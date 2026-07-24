
-- 1) Resserrer has_project_access : le partage individuel n'accorde l'accès
--    que si l'utilisateur est aussi membre de l'organisation du projet.
CREATE OR REPLACE FUNCTION public.has_project_access(_user uuid, _project uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = _project
      AND (
        p.created_by = _user
        OR public.is_org_member(_user, p.organization_id)
        OR p.organization_id = public.get_user_organization_id(_user)
        OR EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = p.organization_id AND o.owner_id = _user)
        OR public.is_super_admin(_user)
        OR (
          _user = ANY (p.visible_to_user_ids)
          AND public.is_org_member(_user, p.organization_id)
        )
      )
  )
$$;

-- 2) Nettoyage des données existantes : retirer des tableaux de partage
--    tout utilisateur qui n'est pas membre de l'organisation du projet.
UPDATE public.projects p
SET visible_to_user_ids = COALESCE(
  ARRAY(
    SELECT uid
    FROM unnest(p.visible_to_user_ids) AS uid
    WHERE public.is_org_member(uid, p.organization_id)
  ),
  ARRAY[]::uuid[]
)
WHERE p.visible_to_user_ids IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(p.visible_to_user_ids) AS uid
    WHERE NOT public.is_org_member(uid, p.organization_id)
  );

UPDATE public.projects p
SET report_recipient_user_ids = COALESCE(
  ARRAY(
    SELECT uid
    FROM unnest(p.report_recipient_user_ids) AS uid
    WHERE public.is_org_member(uid, p.organization_id)
  ),
  ARRAY[]::uuid[]
)
WHERE p.report_recipient_user_ids IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM unnest(p.report_recipient_user_ids) AS uid
    WHERE NOT public.is_org_member(uid, p.organization_id)
  );

-- 3) Trigger de validation : refuser d'ajouter des user_ids hors organisation.
CREATE OR REPLACE FUNCTION public.projects_validate_shared_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invalid_uid uuid;
BEGIN
  IF NEW.visible_to_user_ids IS NOT NULL THEN
    SELECT uid INTO invalid_uid
    FROM unnest(NEW.visible_to_user_ids) AS uid
    WHERE NOT public.is_org_member(uid, NEW.organization_id)
    LIMIT 1;
    IF invalid_uid IS NOT NULL THEN
      RAISE EXCEPTION 'L''utilisateur % ne fait pas partie de l''organisation du projet et ne peut pas être ajouté au partage.', invalid_uid
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.report_recipient_user_ids IS NOT NULL THEN
    SELECT uid INTO invalid_uid
    FROM unnest(NEW.report_recipient_user_ids) AS uid
    WHERE NOT public.is_org_member(uid, NEW.organization_id)
    LIMIT 1;
    IF invalid_uid IS NOT NULL THEN
      RAISE EXCEPTION 'L''utilisateur % ne fait pas partie de l''organisation du projet et ne peut pas recevoir les rapports.', invalid_uid
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_validate_shared_users_trg ON public.projects;
CREATE TRIGGER projects_validate_shared_users_trg
BEFORE INSERT OR UPDATE OF visible_to_user_ids, report_recipient_user_ids, organization_id
ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.projects_validate_shared_users();
