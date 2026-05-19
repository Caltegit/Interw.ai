
-- Phase 1: Fermer les politiques authenticated trop ouvertes
-- qui permettent à n'importe quel utilisateur connecté de voir les données
-- de toutes les organisations.

-- =========================
-- sessions
-- =========================
DROP POLICY IF EXISTS "Authenticated can view sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated can update sessions" ON public.sessions;
DROP POLICY IF EXISTS "Authenticated can create sessions on active projects" ON public.sessions;

-- Lecture : membres de l'organisation du projet, super admin, ou partage actif
CREATE POLICY "Org members can view org sessions"
ON public.sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR p.organization_id = get_user_organization_id(auth.uid())
        OR is_super_admin(auth.uid())
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.reports r
    JOIN public.report_shares rs ON rs.report_id = r.id
    WHERE r.session_id = sessions.id
      AND rs.is_active = true
      AND (rs.expires_at IS NULL OR rs.expires_at > now())
  )
);

-- Update : membres de l'organisation du projet ou super admin
CREATE POLICY "Org members can update org sessions"
ON public.sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR p.organization_id = get_user_organization_id(auth.uid())
        OR is_super_admin(auth.uid())
      )
  )
);

-- Insert : un utilisateur connecté ne crée pas de session en dehors du flux candidat,
-- mais on autorise tout de même la création dans le périmètre de son organisation
-- (utile pour les tests internes RH).
CREATE POLICY "Org members can insert org sessions"
ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sessions.project_id
      AND (
        p.created_by = auth.uid()
        OR p.organization_id = get_user_organization_id(auth.uid())
        OR is_super_admin(auth.uid())
      )
  )
);

-- =========================
-- session_messages
-- =========================
DROP POLICY IF EXISTS "Authenticated can insert messages" ON public.session_messages;

-- L'insert authenticated n'était pas utilisé par le code RH ;
-- il sert uniquement aux opérations admin via service role qui bypass RLS.
-- On le restreint au périmètre de l'organisation pour cohérence.
CREATE POLICY "Org members can insert org session messages"
ON public.session_messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sessions s
    JOIN public.projects p ON p.id = s.project_id
    WHERE s.id = session_messages.session_id
      AND (
        p.created_by = auth.uid()
        OR p.organization_id = get_user_organization_id(auth.uid())
        OR is_super_admin(auth.uid())
      )
  )
);

-- =========================
-- projects
-- =========================
-- La politique "Authenticated can view active projects" rendait visibles
-- tous les projets actifs à tous les utilisateurs connectés.
-- La politique org-scoped existe déjà ("Org members can view org projects v2"),
-- on supprime donc la version ouverte.
DROP POLICY IF EXISTS "Authenticated can view active projects" ON public.projects;
DROP POLICY IF EXISTS "Org members can view org projects" ON public.projects;
-- "Org members can view org projects v2" et "Super admins can view all projects" restent.
