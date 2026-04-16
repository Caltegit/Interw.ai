-- 1. Ajouter la valeur 'super_admin' à l'enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
