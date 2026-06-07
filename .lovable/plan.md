# Rôles Admin dans Paramètres → Membres de l'organisation

## Problème
Sur la capture, Julie Tessier est admin du compte (rôle `admin` dans `user_roles`) mais s'affiche comme « Membre ». Le composant `OrgMembers` ne distingue aujourd'hui que **Propriétaire** (= `organizations.owner_id`) vs **Membre**, et ignore complètement le rôle `admin` stocké dans `user_roles`. De plus, il n'y a aucun moyen pour un admin de promouvoir un autre membre.

## Ce qu'on va faire

### 1. Afficher correctement le badge « Admin »
Dans `src/components/OrgMembers.tsx` :
- Charger en plus les `user_roles` (role = `admin`) liés à l'organisation, en même temps que les profils et l'org.
- Étendre le type `Member` avec `isAdmin: boolean`.
- Logique d'affichage des badges (un seul badge de rôle par ligne) :
  - **Propriétaire** (couronne) si `user_id === owner_id`
  - **Admin** (bouclier) sinon si le user a le rôle `admin` dans cette org
  - **Membre** sinon
- Le badge « Vous » reste affiché en supplément.

### 2. Permettre de promouvoir / rétrograder un membre
Toujours dans `OrgMembers.tsx`, pour l'utilisateur courant qui est `isOwner` (= owner ou admin via `useOrgRole`) :
- Ajouter un bouton d'action sur chaque ligne membre (hors propriétaire et hors soi-même) :
  - Si membre → bouton **« Promouvoir admin »** (icône `ShieldPlus`) → `insert` dans `user_roles` `{ user_id, role: 'admin', organization_id }`
  - Si admin → bouton **« Retirer admin »** (icône `ShieldMinus`) → `delete` sur `user_roles` correspondant
- Le propriétaire ne peut jamais être rétrogradé (badge couronne, pas de bouton).
- Toast de confirmation + `loadData()` pour rafraîchir.

### 3. RLS / backend
Aucune migration nécessaire : les policies existantes sur `user_roles` autorisent déjà les admins d'org à `INSERT` et `DELETE` des rôles dans leur organisation (`is_org_admin(auth.uid(), organization_id)`), et empêchent de toucher au rôle du propriétaire.

### 4. Texte d'aide
Mettre à jour la phrase « Seul le propriétaire peut inviter ou retirer des membres. » → « Seuls les admins peuvent inviter, promouvoir ou retirer des membres. » (cohérent avec `useOrgRole` qui considère déjà les admins legacy comme `isOwner`).

## Hors scope
- Pas de changement sur le flux d'invitation ni sur le super admin.
- Pas de changement de schéma DB.
