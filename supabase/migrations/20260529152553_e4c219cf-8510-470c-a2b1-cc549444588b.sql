-- Visibilité du projet par membre
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS visible_to_user_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

-- Remplacer la policy SELECT existante
DROP POLICY IF EXISTS "Org members can view org projects v2" ON public.projects;

CREATE POLICY "Project visibility v3"
  ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR auth.uid() = ANY (visible_to_user_ids)
    OR EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = projects.organization_id
        AND o.owner_id = auth.uid()
    )
    OR is_super_admin(auth.uid())
  );
