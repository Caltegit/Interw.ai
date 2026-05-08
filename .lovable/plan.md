# Multi-organisation avec sélecteur

## Idée

Un utilisateur peut appartenir à plusieurs organisations. À tout moment, **une seule organisation est "active"** (celle qui détermine ce qu'il voit). Un menu déroulant dans la sidebar permet de basculer entre les organisations dont il est membre, exactement comme la prise en main super admin pose un bandeau.

L'astuce qui évite de tout refactoriser : on garde `profiles.organization_id` comme "organisation active courante". Toutes les politiques RLS existantes (`get_user_organization_id`) continuent de fonctionner sans changement. On ajoute juste, à côté, la liste des organisations accessibles.

## Schéma

Nouvelle table `organization_members` (source de vérité de l'appartenance) :

| colonne | type |
|---|---|
| user_id | uuid |
| organization_id | uuid |
| created_at | timestamptz |

Contrainte unique `(user_id, organization_id)`. RLS : un utilisateur voit ses propres lignes ; les owners voient les membres de leur org ; super admin voit tout.

Migration de données : on insère une ligne dans `organization_members` pour chaque profil ayant déjà un `organization_id`. `profiles.organization_id` reste et devient "organisation active".

Nouvelle fonction RPC `switch_active_organization(_org_id uuid)` :
- vérifie que l'utilisateur est bien membre de l'org cible (présence dans `organization_members`)
- met à jour `profiles.organization_id`
- retourne l'org id

## Acceptation d'invitation

`accept_invitation` est modifiée pour :
- insérer dans `organization_members` (idempotent via `ON CONFLICT DO NOTHING`)
- ne plus écraser `profiles.organization_id` si le user a déjà une org active — l'invitation devient juste un nouvel accès, l'utilisateur basculera quand il veut
- garder le comportement "premier arrivé = owner + projet démo" inchangé pour la nouvelle org

Si c'est la **première** organisation du user, on définit aussi `profiles.organization_id` (org active par défaut).

## Envoi d'invitation

Aujourd'hui rien n'empêche d'inviter un email déjà membre d'une autre org → désormais c'est explicitement supporté. On ajoute juste un garde-fou : refuser une invitation si l'email est déjà membre de **cette** organisation précise.

## UI : sélecteur d'organisation

Composant `OrganizationSwitcher` placé en haut de la sidebar (`AppSidebar.tsx`), au-dessus de la navigation. Affiche le logo + nom de l'org active, avec un chevron. Au clic, dropdown qui liste les organisations du user (requête sur `organization_members` jointe à `organizations`). Sélection → appel `switch_active_organization` → reload de la page (la façon la plus sûre de réinitialiser tous les caches React Query qui dépendent de l'org).

S'il n'y a qu'une seule org : on affiche le nom mais pas le chevron (rien à choisir).

## Cas particuliers traités

- **Owner d'une org qui en quitte une autre** : pas de "quitter une org" dans ce plan, on ne traite que l'ajout. À voir plus tard.
- **Org supprimée pendant que l'utilisateur l'a active** : `switch_active_organization` rejette si non-membre ; au login, si `profiles.organization_id` ne correspond plus à un membership valide, on bascule automatiquement sur la première org disponible (ou null).
- **Hooks `useOrgRole`** : pas de changement d'API. Il continue à lire l'org active. Un petit ajout : exposer `availableOrganizations` pour le switcher.
- **`user_roles`** : la table reste avec sa colonne `organization_id`, donc un user peut avoir des rôles différents par org. Aucun changement de schéma nécessaire.

## Détails techniques

```text
[ Sidebar ]
 ├─ OrganizationSwitcher  (nouveau)
 │    ├─ logo + nom org active
 │    └─ dropdown : liste orgs du user → switch_active_organization()
 ├─ Navigation existante
 └─ ...
```

Fichiers touchés :
- migration SQL : table `organization_members`, RLS, backfill, RPC `switch_active_organization`, nouvelle version d'`accept_invitation`, garde-fou sur insertion d'invitation
- `src/hooks/useOrgRole.ts` : ajout de `availableOrganizations`
- `src/components/AppSidebar.tsx` : insertion du switcher
- `src/components/OrganizationSwitcher.tsx` : nouveau
- `src/pages/InviteSignup.tsx` : message légèrement adapté ("Vous rejoignez X en plus de vos organisations existantes" si applicable)

## Hors scope (à valider séparément si besoin)

- Quitter une organisation
- Transfert d'ownership
- Invitations envoyées avec un rôle spécifique par org
- Vue "toutes mes organisations" agrégée
