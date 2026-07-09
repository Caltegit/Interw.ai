-- Restaure la visibilité des organisations pour les utilisateurs connectés.
-- Aucune policy existante n'est modifiée ou supprimée.

-- 1) Super admins : voient toutes les organisations.
CREATE POLICY "Super admins can view all organizations"
ON public.organizations
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 2) Membres : voient l'organisation à laquelle ils appartiennent (via profiles).
CREATE POLICY "Members can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = auth.uid()
      AND p.organization_id = organizations.id
  )
);