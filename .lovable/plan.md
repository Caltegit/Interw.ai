
Refonte du système de gestion des organisations pour préparer la commercialisation : rôles admin/membre, logo uploadable, et permissions granulaires.

## État actuel
- Tous les membres d'une org ont le rôle `recruiter` (aucun admin distinct)
- Le créateur initial n'est pas marqué comme admin
- Le logo se renseigne par URL (pas d'upload)
- N'importe quel membre peut inviter, supprimer un autre membre, modifier l'org
- L'enum `app_role` existe avec `admin`, `recruiter`, `viewer` mais seul `recruiter` est utilisé

## Ce qu'on va construire

### 1. Rôles par organisation
Le rôle `admin` actuel est global. On le remplace par une notion d'**admin d'organisation** :
- Ajouter `organization_id` à `user_roles` (un user peut être admin d'une org spécifique)
- Nouvelle fonction `is_org_admin(_user_id, _org_id)` SECURITY DEFINER
- Le créateur d'une org devient automatiquement admin de cette org
- À l'acceptation d'invitation : rôle `recruiter` par défaut (membre simple)

### 2. Permissions revues
| Action | Admin org | Membre |
|---|---|---|
| Inviter de nouveaux membres | ✅ | ❌ |
| Retirer un membre | ✅ | ❌ |
| Promouvoir/rétrograder un membre | ✅ | ❌ |
| Modifier nom + logo de l'org | ✅ | ❌ |
| Créer/gérer ses propres projets | ✅ | ✅ |
| Voir les projets de l'org | ✅ | ✅ (lecture seule sur ceux des autres) |

RLS de `organization_invitations`, `organizations` (UPDATE), et UI conditionnelle mise à jour en conséquence.

### 3. Upload de logo
- Réutiliser le bucket `media` (déjà public) avec un dossier `org-logos/{org_id}/`
- Composant d'upload dans Settings (drag & drop + prévisualisation)
- Validation : PNG/JPG/SVG/WEBP, max 2 Mo, redimensionnement côté client si > 512px
- Le champ `logo_url` continue de stocker l'URL publique du fichier
- Affichage du logo dans la sidebar (header) et sur les pages candidat (déjà câblé via `orgLogo`)

### 4. UI mise à jour
**Page Paramètres → section Organisation**
- Upload zone pour le logo (remplace le champ URL)
- Champ nom (éditable seulement si admin)
- Bouton "Enregistrer" actif seulement si admin

**Section Membres**
- Badge `Admin` / `Recruteur` à côté de chaque membre (au lieu de `Recruteur` partout)
- Bouton "Promouvoir admin" / "Rétrograder" visible seulement pour les admins
- Boutons inviter/supprimer cachés si l'utilisateur n'est pas admin
- Message informatif pour les non-admins : "Seuls les administrateurs peuvent gérer les membres"

### 5. Hook `useOrgRole`
Nouveau hook qui retourne `{ isAdmin, isMember, role, loading }` pour conditionner facilement l'UI partout.

### 6. Anticipation commercialisation
- Le rôle `admin org` sera celui qui gère le **billing** plus tard (Stripe checkout, plan)
- La structure permet d'ajouter facilement `owner` (créateur, non supprimable) si besoin plus tard
- Préparation pour les quotas : les admins verront la consommation de leur org

## Fichiers impactés

**Migration DB** (1 migration)
- `ALTER TABLE user_roles ADD COLUMN organization_id uuid` + index unique `(user_id, role, organization_id)`
- Nouvelle fonction `is_org_admin(_user_id, _org_id)`
- Backfill : promouvoir tous les créateurs d'org existants comme admins
- Mise à jour RLS de `organizations` (UPDATE → admins only), `organization_invitations` (INSERT/DELETE → admins only)
- Mise à jour de `accept_invitation` pour insérer le rôle avec `organization_id`

**Code**
- `src/hooks/useOrgRole.ts` (nouveau) — détecte si l'user est admin de son org
- `src/components/OrgLogoUpload.tsx` (nouveau) — composant d'upload réutilisable
- `src/components/OrgMembers.tsx` — badges de rôle, boutons promote/demote, masquage si non-admin
- `src/pages/Settings.tsx` — intègre OrgLogoUpload, désactive les inputs si non-admin
- `src/contexts/AuthContext.tsx` — expose `organizationId` directement (évite d'appeler la RPC partout)

## Hors scope (à faire plus tard)
- Stripe / paiements / plans freemium
- Quotas (nombre de projets, sessions/mois)
- Page de facturation
- Notion d'`owner` distinct de l'admin (transfert de propriété)
- Sous-domaines par organisation

## Question avant implémentation
Un point à clarifier :

**Le créateur d'une org peut-il être rétrogradé / supprimé par un autre admin ?**
- Option A (simple) : oui, tous les admins sont égaux. Risque : un admin peut "voler" l'org en supprimant le créateur.
- Option B (recommandée pour SaaS) : ajouter une colonne `owner_id` sur `organizations`. L'owner ne peut pas être supprimé/rétrogradé. Lui seul peut transférer la propriété. C'est ce que font Slack, Notion, Linear.

Je recommande **Option B** car ça anticipe vraiment la commercialisation (l'owner = celui qui paie l'abonnement).

Dis-moi quelle option tu préfères et je lance l'implémentation.
