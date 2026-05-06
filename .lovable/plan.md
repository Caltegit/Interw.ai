# Refonte des rôles d'organisation : Propriétaire + Users

## Objectif

Simplifier le modèle de rôles : un seul **Propriétaire** par organisation (créé en même temps que l'orga), tous les autres membres sont des **Users** avec les mêmes droits. Les sessions sont visibles par tous mais assignées à un user.

## Modèle final

- **Propriétaire** : 1 par orga. Mêmes droits qu'un User + invitation/retrait de membres + paramètres de l'orga (nom, slug, logo, modèles d'emails).
- **User** : N par orga. Voit toutes les données de l'orga, peut créer/modifier/supprimer projets, sessions, rapports.
- **Super admin** : inchangé (back-office Lovable).

## Garde-fous pour les utilisateurs actuels

Audit effectué : 14 organisations, toutes avec un `owner_id` déjà renseigné. 3 orgas ont des co-administrateurs (ALBO, CLEM A, Morning) — leurs droits seront préservés.

- **Co-admins existants conservés** : on garde les lignes `admin` actuelles dans `user_roles`. La logique devient : `isOwner = (owner_id == user.id) OR has_role('admin', org)`. Aucune perte de droit pour les co-admins en place.
- **Nouvelles invitations** : ne créent plus aucune ligne dans `user_roles` (le statut "User" découle juste de `profiles.organization_id`).
- **Nettoyage ciblé** : suppression uniquement des rôles `recruiter` et `viewer` (1 seule ligne réellement présente).
- **Création d'orga** : email/prénom/nom du propriétaire obligatoires uniquement pour les **nouvelles** orgas.

## Changements

### 1. Création d'une organisation (super admin)

`CreateOrgDialog` + edge `superadmin-create-org` : 3 champs obligatoires en plus (email propriétaire, prénom, nom).

Comportement :
- Si l'email existe déjà comme utilisateur : on lui assigne `organization_id` + `owner_id` direct.
- Sinon : création d'une invitation. À l'acceptation (`accept-invitation`), si `owner_id IS NULL` sur l'orga, le nouvel utilisateur devient propriétaire.

### 2. Sessions assignées à un user

Nouvelle colonne `sessions.assigned_to` (uuid, FK `auth.users` ON DELETE SET NULL).

Backfill :
```sql
UPDATE sessions s
SET assigned_to = COALESCE(p.created_by, o.owner_id)
FROM projects p
JOIN organizations o ON o.id = p.organization_id
WHERE p.id = s.project_id;
```

Visibilité : toutes les sessions de l'orga restent visibles par tous les Users (RLS inchangée). On affiche juste « Assignée à » + un filtre « Mes sessions ».

### 3. UI

- **`OrgMembers.tsx`** : suppression des boutons promouvoir/rétrograder. Badge « Propriétaire » pour l'owner, badge « Membre » pour les autres. Seul le propriétaire peut inviter/retirer.
- **`Settings.tsx` / `EmailTemplates.tsx`** : remplacement de `isAdmin` par `isOwner` pour gérer les paramètres de l'orga.
- **Liste des sessions** : nouvelle colonne « Assignée à », filtre « Mes sessions », sélecteur de réassignation.
- **`useOrgRole`** : retourne `{ isOwner, isMember, organizationId, ownerId, loading }` (suppression de `role`/`isAdmin` côté API publique du hook, mais `isOwner` reste vrai aussi pour les co-admins legacy).

### 4. Edge functions

- `superadmin-create-org` : reçoit `owner_email`, `owner_first_name`, `owner_last_name`. Crée invitation ou assigne directement.
- `accept-invitation` : si l'orga n'a pas d'`owner_id`, l'utilisateur devient propriétaire. N'insère plus de rôle dans `user_roles`.
- `send-invitation` : inchangé sur le fond.
- `generate-report` : envoie le mail au `sessions.assigned_to` au lieu de `projects.created_by`. Fallback sur le propriétaire si null.

## Hors périmètre

- Transfert de propriété (réassignation du propriétaire) — à voir plus tard.
- Notifications quand une session est assignée.
- Statistiques par membre.

## Détails techniques

**Migration SQL** :
1. `ALTER TABLE sessions ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;`
2. Backfill (cf. ci-dessus).
3. `CREATE INDEX idx_sessions_assigned_to ON sessions(assigned_to);`
4. `DELETE FROM user_roles WHERE role IN ('recruiter','viewer');`

**Fonction SQL `is_org_admin`** : on garde son comportement actuel (vérifie `owner_id` OU rôle `admin`), ce qui assure la rétrocompatibilité pour les co-admins existants sans modifier les politiques RLS.

**Fichiers modifiés** :
- `src/components/superadmin/CreateOrgDialog.tsx`
- `supabase/functions/superadmin-create-org/index.ts`
- `supabase/functions/accept-invitation/index.ts`
- `supabase/functions/generate-report/index.ts`
- `src/components/OrgMembers.tsx`
- `src/hooks/useOrgRole.ts`
- `src/pages/Settings.tsx`, `src/pages/EmailTemplates.tsx`
- Pages listant les sessions (Dashboard, ProjectDetail) : ajout colonne + filtre + réassignation.
