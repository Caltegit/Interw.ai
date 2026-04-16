
-- 2. Fonction is_super_admin (SECURITY DEFINER pour éviter la récursion RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'::app_role
  )
$$;

-- 3. RLS pour organizations
CREATE POLICY "Super admins can insert organizations"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete organizations"
ON public.organizations FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 4. RLS pour profiles - super admin voit tous les profils
CREATE POLICY "Super admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 5. RLS pour user_roles - super admin gère tous les rôles
CREATE POLICY "Super admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can insert any role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete any role"
ON public.user_roles FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 6. RLS pour organization_invitations
CREATE POLICY "Super admins can view all invitations"
ON public.organization_invitations FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create any invitation"
ON public.organization_invitations FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update any invitation"
ON public.organization_invitations FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete any invitation"
ON public.organization_invitations FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 7. RLS pour projects (lecture globale)
CREATE POLICY "Super admins can view all projects"
ON public.projects FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 8. RLS pour sessions (lecture globale super admin pour stats)
CREATE POLICY "Super admins can view all sessions"
ON public.sessions FOR SELECT TO authenticated
USING (public.is_super_admin(auth.uid()));

-- 9. Bootstrap : promouvoir clement.alteresco@gmail.com en super admin
INSERT INTO public.user_roles (user_id, role, organization_id)
SELECT user_id, 'super_admin'::app_role, NULL
FROM public.profiles
WHERE email = 'clement.alteresco@gmail.com'
ON CONFLICT DO NOTHING;
