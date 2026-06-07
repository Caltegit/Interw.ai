# Gestion des rôles : Super Admin + Propriétaire

## Règles de permissions
- **Super Admin** (back-office `/superadmin/orgs/:id`) : peut tout faire — promouvoir/rétrograder admin ↔ membre, **et transférer la propriété** à un autre membre.
- **Propriétaire** d'une organisation (Paramètres → Membres) : peut promouvoir/rétrograder admin ↔ membre. **Ne peut pas** transférer la propriété (réservé au Super Admin) ni se rétrograder lui-même.
- **Admin** d'organisation : ne peut PAS modifier les rôles. Peut toujours inviter et retirer des membres (comportement existant conservé).
- **Membre** : aucune action de gestion.

## Changements

### 1. `src/pages/SuperAdminOrgDetail.tsx` — gestion complète par le Super Admin
Pour chaque ligne membre, les badges deviennent interactifs :
- **Membre** ↔ **Admin** : clic sur le badge → confirmation → insert/delete dans `user_roles` (rôle `admin`, scope `organization_id`).
- **Propriétaire** : clic sur le badge couronne d'un autre membre → dialog « Transférer la propriété à X ? Cette action est irréversible. » → met à jour `organizations.owner_id`. L'ancien propriétaire reste dans l'org (devient simple membre, ou admin s'il l'était déjà).
- Ajouter, à côté des badges Admin/Membre des non-propriétaires, un bouton **« Faire propriétaire »** (icône `Crown`) → même dialog de transfert.
- Tooltips clairs sur chaque action.
- `loadData()` après chaque mutation.

### 2. `src/components/OrgMembers.tsx` — gestion admin réservée au propriétaire
- Récupérer `owner_id` (déjà fait) et exposer `isCurrentUserOwner = user.id === org.owner_id`.
- Les boutons `ShieldPlus` / `ShieldMinus` ne s'affichent que si `isCurrentUserOwner` (au lieu de `isOwner` du hook `useOrgRole` qui considère aussi les admins).
- Garder le badge informatif Propriétaire/Admin/Membre/Vous pour tout le monde.
- Conserver l'invitation et le retrait de membres comme aujourd'hui (`isOwner` du hook).
- Texte d'aide : « Le transfert de la propriété du compte est réservé au support Interw. »

### 3. Backend — RLS pour le transfert de propriété
Vérifier (via `supabase--read_query`) que la policy `UPDATE` sur `organizations` permet au super admin de modifier `owner_id`. Si non, ajouter via migration une policy :
```sql
CREATE POLICY "Super admin can update organizations"
ON public.organizations FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
```
(Les policies existantes restent pour le propriétaire qui édite son org normalement.)

Aucune autre migration nécessaire : les policies sur `user_roles` autorisent déjà le propriétaire et le super admin à insert/delete.

## Hors scope
- Pas de changement sur l'invitation, le retrait de membres, ou les autres tables.
- Pas d'historique de transfert de propriété.
