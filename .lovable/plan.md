# Simplification des rôles : Admin / Membre

Aujourd'hui une organisation peut contenir 4 rôles : `admin`, `recruiter`, `viewer`, et des utilisateurs sans rôle (juste présents via `organization_members`). On rationalise à **2 rôles** : `admin` et `member` (le `super_admin` reste pour l'équipe interne, hors orga).

## Différence Admin vs Membre (cible)

**Admin de l'organisation**
- Tous les droits sur l'organisation et son contenu
- Invite / retire des utilisateurs, change leur rôle
- Crée, modifie, supprime les projets, questions, critères
- Accède aux paramètres de l'organisation (logo, nom, branding, alertes mail)
- Voit toutes les sessions et tous les rapports de l'orga
- Prend/édite les décisions de recrutement, note les candidats

**Membre de l'organisation**
- Voit toutes les sessions, projets et rapports de l'orga
- Peut créer/modifier des projets et lancer des entretiens (utilisation produit)
- Peut prendre des décisions de recrutement et écrire des notes sur les candidats
- **Ne peut pas** : gérer les utilisateurs, supprimer l'organisation, modifier les paramètres globaux de l'orga, ni supprimer les projets/sessions des autres admins

Concrètement, le seul "gate" qui change le comportement aujourd'hui c'est `isOwner / isAdmin` (déterminé par `organizations.owner_id` ou un rôle `admin` dans `user_roles`). Tout le reste (recruiter, viewer, sans rôle) se comportait déjà comme un membre standard côté UI. On formalise donc l'existant.

## Changements base de données

1. Ajouter la valeur `member` à l'enum `app_role`.
2. Migrer les données :
   - `user_roles.role = 'recruiter'` → `'member'` (4 lignes)
   - `user_roles.role = 'viewer'` → `'member'` (0 ligne aujourd'hui)
   - Pour chaque utilisateur présent dans `organization_members` mais sans ligne dans `user_roles` pour cette orga (et non-owner, non super_admin), créer une ligne `role = 'member'`. Ainsi "sans rôle" disparaît.
3. Retirer `'recruiter'` et `'viewer'` de l'enum (créer un nouvel enum `app_role` à 3 valeurs `admin | member | super_admin`, swap des colonnes, drop de l'ancien).
4. Mettre à jour `is_org_admin` (déjà OK : ne regarde que `admin`) et ajouter une fonction utilitaire `is_org_member_role(_user_id, _org_id)` qui renvoie vrai si l'utilisateur a `admin` ou `member` dans l'orga (utilisée plus tard si besoin par RLS).
5. Mettre à jour les triggers existants :
   - `trg_seed_on_admin_role` qui réagissait aux insertions `admin` dans `user_roles` reste tel quel.
   - Aucun policy RLS ne référence `recruiter`/`viewer` directement (vérifié), donc rien à réécrire côté RLS.

## Changements code

- `src/components/superadmin/EditUserDialog.tsx` : remplacer les options "Recruteur" / "Viewer" par "Membre". Valeur par défaut `member`.
- `src/components/superadmin/CreateUserInOrgDialog.tsx` : `role: "member"` au lieu de `recruiter`.
- `src/pages/SuperAdminOrgDetail.tsx` : remplacer les badges `recruiter` / `viewer` par un unique badge `Membre`.
- `supabase/functions/superadmin-manage-user/index.ts` : `targetRole = role || "member"`.
- `src/hooks/useOrgRole.ts` : conserver `isAdmin` (= owner ou rôle admin) et exposer correctement `isMember` (présent dans `user_roles` avec `admin`/`member`, ou via `organization_members`). Commentaire mis à jour.
- Texte/UI : "Observateur" / "Recruteur" → "Membre" partout où visible.

## Vérifications

- Lister les 4 utilisateurs `recruiter` actuels : ils restent membres avec exactement les mêmes accès produit qu'aujourd'hui (aucun ne perd ni ne gagne de droit).
- Vérifier qu'aucune policy RLS ne casse après le swap d'enum (re-run du linter Supabase).
- Vérifier que la création d'utilisateur depuis le super admin produit bien un rôle `member`.

## Hors-scope

- Pas de changement sur `super_admin` (reste réservé à l'équipe).
- Pas de changement sur le système d'invitations ni sur les magic links.
- Pas de redesign UI au-delà du renommage des libellés/badges.
