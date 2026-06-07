
DO $$
DECLARE
  _template_id constant uuid := '3519629b-8906-477f-91e7-fc6f12ffa0d2';
  _src_org uuid;
  _row record;
BEGIN
  SELECT organization_id INTO _src_org FROM public.projects WHERE id = _template_id;
  FOR _row IN
    SELECT DISTINCT ON (ur.organization_id) ur.organization_id, ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
      AND ur.organization_id IS DISTINCT FROM _src_org
      AND NOT EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.organization_id = ur.organization_id
          AND p.title = 'Votre premier entretien en digital !'
      )
    ORDER BY ur.organization_id, ur.user_id
  LOOP
    PERFORM public.clone_template_project_into_org(_row.organization_id, _row.user_id);
  END LOOP;
END $$;
