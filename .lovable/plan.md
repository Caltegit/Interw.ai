
## Ajouter un rôle "Super Admin" (toi, propriétaire de la plateforme)

### Pourquoi c'est nécessaire
Aujourd'hui n'importe qui peut créer un compte via `/login` → ça crée un user mais sans organisation. Il n'y a aucun garde-fou : pas de moyen pour toi de :
- Créer manuellement les organisations clientes
- Désigner l'admin de chaque organisation
- Voir/gérer toutes les organisations depuis une console
- Bloquer les inscriptions sauvages

C'est exactement le modèle SaaS B2B classique (Lovable, Linear, Notion en early-stage) : **toi seul provisionnes les comptes clients**.

### Ce qu'on va construire

#### 1. Nouveau rôle `super_admin`
- Réutilise l'enum `app_role` existant (déjà `admin/recruiter/viewer`) → on ajoute `super_admin`
- Stocké dans `user_roles` avec `organization_id = NULL` (rôle global, pas lié à une org)
- Nouvelle fonction `is_super_admin(_user_id)` SECURITY DEFINER

#### 2. Console super admin (`/admin`)
Page protégée accessible uniquement aux super admins. 4 onglets :

**Organisations**
- Liste de toutes les orgs (nom, logo, owner, nb membres, nb projets, date création)
- Bouton **"+ Créer une organisation"** → modal avec :
  - Nom de l'organisation
  - Email de l'admin client (existant ou à créer)
  - Nom complet de l'admin
- Workflow à la création :
  1. Crée l'organisation
  2. Envoie une invitation email à l'admin (réutilise `send-invitation`)
  3. Quand l'admin accepte, il devient `owner_id` + rôle `admin` automatiquement
- Actions par org : voir détails, suspendre, supprimer

**Utilisateurs**
- Liste de tous les users de la plateforme (email, org, rôle, date inscription, dernière connexion)
- Filtres par organisation
- Action : promouvoir/rétrograder super_admin

**Statistiques globales**
- Total orgs / users / projets / sessions
- Activité récente

**Logs (optionnel, simple)**
- Dernières organisations créées, dernières invitations, dernières sessions complétées

#### 3. Bloquer les inscriptions sauvages
Aujourd'hui `/login` permet le signup libre. Deux changements :
- **Cacher le toggle "Pas de compte ? S'inscrire"** sur `/login` (le formulaire devient login-only)
- **Garder le signup uniquement via `/invite/{token}`** (déjà en place)

Résultat : impossible de créer un compte sans invitation. Toi (super admin) crées les orgs → l'admin client est invité → il invite ses recruteurs.

#### 4. Modifications RLS pour super admin
Le super admin doit pouvoir voir/gérer **toutes** les orgs et tous les users :
- `organizations` : INSERT + UPDATE + DELETE pour super_admin
- `profiles` : SELECT all pour super_admin
- `user_roles` : ALL pour super_admin
- `organization_invitations` : ALL pour super_admin

#### 5. Bootstrap : comment tu deviens super admin
Migration SQL qui te promeut super admin par email :
```sql
INSERT INTO user_roles (user_id, role)
SELECT user_id, 'super_admin'::app_role
FROM profiles WHERE email = 'TON_EMAIL';
```
Tu me donnes ton email avant que je lance, ou je mets un placeholder que tu remplis.

#### 6. UI — accès à la console
- Lien "Super Admin" dans la sidebar visible uniquement si `isSuperAdmin = true`
- Hook `useSuperAdmin()` qui check la présence du rôle

### Fichiers impactés

**Migration SQL** (1 migration)
- `ALTER TYPE app_role ADD VALUE 'super_admin'`
- Fonction `is_super_admin(_user_id)`
- Politiques RLS super_admin sur `organizations`, `profiles`, `user_roles`, `organization_invitations`, `projects` (lecture)
- Bootstrap : promotion de ton email en super_admin

**Code**
- `src/hooks/useSuperAdmin.ts` (nouveau)
- `src/pages/SuperAdmin.tsx` (nouveau) — console avec onglets
- `src/components/superadmin/CreateOrgDialog.tsx` (nouveau)
- `src/components/superadmin/OrgsTable.tsx` (nouveau)
- `src/components/superadmin/UsersTable.tsx` (nouveau)
- `src/components/superadmin/StatsOverview.tsx` (nouveau)
- `src/App.tsx` — route `/admin` protégée
- `src/components/AppSidebar.tsx` — lien conditionnel
- `src/pages/Login.tsx` — retirer le toggle signup
- `src/components/ProtectedRoute.tsx` — variante `requireSuperAdmin`

### Hors scope (pour plus tard)
- Facturation Stripe par org
- Quotas et limites par plan
- Impersonation (se connecter "en tant que" un user pour debug)
- Audit log détaillé

### Question avant implémentation

**Workflow de création d'organisation : email de l'admin existant ou pas ?**

- **Option A** : Tu rentres juste un email → invitation envoyée → si l'admin a déjà un compte il accepte direct, sinon il signup via le lien d'invitation. C'est le flux actuel pour les recruteurs, on le réutilise. **Simple et cohérent.**
- **Option B** : Tu crées le compte admin directement avec un mot de passe temporaire que tu lui transmets. Plus contrôlé, mais nécessite un edge function avec service-role et c'est moins propre côté sécurité (mots de passe en clair).

Je recommande **Option A**.

**Et : confirme-moi ton email pour que je te promeuve super admin dans la migration.**
