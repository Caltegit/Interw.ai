-- ============================================================================
-- 1) ORGANISATIONS : restreindre les colonnes lisibles par anon
-- ============================================================================
-- Le pattern PostgREST + RLS ne filtre pas par colonne. On révoque le SELECT
-- global anon sur la table, puis on ne grant que les colonnes strictement
-- publiques (celles utilisées par la page /org/:slug et la page publique projet).
REVOKE SELECT ON public.organizations FROM anon;
GRANT SELECT
  (id, name, slug, logo_url, created_at)
  ON public.organizations TO anon;

-- La policy USING (true) reste utile pour permettre la lecture des colonnes
-- grantées ; on la remplace par une expression plus explicite (par slug non nul).
DROP POLICY IF EXISTS "Anyone can view orgs" ON public.organizations;
DROP POLICY IF EXISTS "Anon can view orgs by slug" ON public.organizations;
CREATE POLICY "Anon can read public org fields"
  ON public.organizations FOR SELECT
  TO anon
  USING (slug IS NOT NULL);

-- ============================================================================
-- 2) USER_ROLES : empêcher un org_admin d'attribuer le rôle super_admin
-- ============================================================================
DROP POLICY IF EXISTS "Org admins can insert org roles" ON public.user_roles;
CREATE POLICY "Org admins can insert non-super org roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    role <> 'super_admin'::app_role
    AND organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- On empêche aussi l'UPDATE vers super_admin par cette même voie.
DROP POLICY IF EXISTS "Org admins can update org roles" ON public.user_roles;
CREATE POLICY "Org admins can update non-super org roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
    AND role <> 'super_admin'::app_role
  )
  WITH CHECK (
    role <> 'super_admin'::app_role
    AND organization_id IS NOT NULL
    AND public.is_org_admin(auth.uid(), organization_id)
  );

-- ============================================================================
-- 3) REPORT_SHARES : retirer l'accès direct anon (route via edge function)
-- ============================================================================
-- L'edge function consume-report-share prend un token en entrée et lit la ligne
-- via le service_role. Aucune raison qu'anon puisse lister/lire directement.
DROP POLICY IF EXISTS "Anon can view active shares" ON public.report_shares;
DROP POLICY IF EXISTS "Authenticated can view active shares" ON public.report_shares;

-- Pareil pour la lecture des reports partagés en anon : l'edge function renvoie
-- déjà le rapport après validation du token.
DROP POLICY IF EXISTS "Anon can view shared reports" ON public.reports;

-- ============================================================================
-- 4) SESSION_ATTEMPTS : remplacer WITH CHECK (true) par une contrainte réelle
-- ============================================================================
DROP POLICY IF EXISTS "Anon can insert session attempts" ON public.session_attempts;
CREATE POLICY "Anon can insert attempts for existing sessions"
  ON public.session_attempts FOR INSERT
  TO anon
  WITH CHECK (
    session_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = session_attempts.session_id
        AND p.status = 'active'::project_status
    )
  );

-- ============================================================================
-- 5) SEARCH_PATH FIXE sur toutes les fonctions SECURITY DEFINER publiques
-- ============================================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid, p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p.proconfig, ARRAY[]::text[])) AS c
        WHERE c LIKE 'search_path=%'
      )
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', r.sig);
  END LOOP;
END $$;

-- ============================================================================
-- 6) SECURITY DEFINER : révoquer l'exécution publique, ne conserver que les
--    fonctions strictement nécessaires au front (rôle authenticated) et au
--    parcours candidat anonyme (rôle anon).
-- ============================================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- Rendre à authenticated les fonctions appelées depuis le front RH.
DO $$
DECLARE
  fname text;
  sig   text;
BEGIN
  FOR fname IN SELECT unnest(ARRAY[
    'accept_invitation',
    'admin_cancel_report_job',
    'admin_force_report_job',
    'admin_search_sessions',
    'admin_sessions_queue_stats',
    'delete_project',
    'get_user_organization_id',
    'has_role',
    'is_super_admin',
    'is_org_admin',
    'is_org_member',
    'switch_active_organization',
    'link_pending_invitation',
    'clone_template_project_into_org',
    'seed_starred_templates_into_org',
    'get_project_stats_timeseries'
  ])
  LOOP
    FOR sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fname
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', sig);
    END LOOP;
  END LOOP;
END $$;

-- Rendre à anon les fonctions strictement utiles au parcours candidat.
DO $$
DECLARE
  fname text;
  sig   text;
BEGIN
  FOR fname IN SELECT unnest(ARRAY[
    'get_session_id_by_token',
    'mark_attempt_proceeded',
    'has_role',
    'is_org_admin',
    'is_org_member',
    'get_user_organization_id'
  ])
  LOOP
    FOR sig IN
      SELECT p.oid::regprocedure::text
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fname
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', sig);
    END LOOP;
  END LOOP;
END $$;

-- Service_role garde tout accès pour edge functions et workers.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;
