

## Refonte de la création Organisations & Utilisateurs (Super Admin)

### Ce qui change

**1. Création d'organisation simplifiée**

Le dialogue actuel demande nom + email admin + nom admin (mélange org / user). On le scinde : la création d'organisation ne crée plus l'utilisateur admin. Champs :

- **Nom** *(obligatoire)*
- **Tarif** (texte libre, ex. « 99 €/mois ») — optionnel
- **Note client** (zone de texte) — optionnel  
- **Charger les bibliothèques de modèles par défaut** — bascule oui/non, par défaut **oui**

Le slug reste généré automatiquement à partir du nom (caché de l'UI).

**2. Création d'utilisateur déplacée dans la fiche organisation**

L'onglet « Utilisateurs » garde sa table de consultation/édition globale, mais **le bouton « Créer un utilisateur » disparaît du niveau global**.

À la place, dans l'onglet « Organisations », chaque ligne devient cliquable → ouvre une **page « Détail organisation »** (`/superadmin/orgs/:orgId`) qui affiche :

- Infos de l'org (nom, tarif, note, date, logo)
- Liste des membres de cette org (réutilise `OrgMembers` existant)
- Liste des projets
- Bouton **« Créer un utilisateur »** dans cette org

Le dialogue de création utilisateur depuis cette page :
- **Email** *
- **Nom complet** *  (devient obligatoire)
- **Mot de passe** (optionnel — si vide, invitation envoyée)
- **Rôle** * (admin / recruiter / viewer — pas de super_admin ici car contextuel à l'org)

L'organisation est verrouillée sur l'org en cours, plus de sélecteur.

### Détails techniques

**Migration SQL**
```sql
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pricing text,
  ADD COLUMN IF NOT EXISTS client_notes text;
```

**Edge function `superadmin-create-org`** — refonte :
- Plus d'`admin_email` / `admin_full_name` requis.
- Accepte : `org_name` *, `pricing?`, `client_notes?`, `seed_libraries?` (bool, défaut true).
- Si `seed_libraries = false`, on insère l'org **sans** owner_id (le trigger `trg_seed_org_question_templates` n'a pas de creator → ne seede rien) ; si `true`, on positionne owner_id = caller (super admin) le temps du seed, puis on remet `owner_id = NULL` immédiatement après pour ne pas verrouiller l'org sur le super admin. Le trigger `trg_seed_on_owner_set` se déclenchera sur l'écriture initiale et seede templates + projet démo.
- Plus d'invitation envoyée à la création.

**Edge function `superadmin-manage-user`** (action `create`) — inchangée côté API mais le front ne lui passe plus que `email`, `full_name`, `password?`, `organization_id`, `role` (toujours fournis maintenant).

**Front — nouveaux/modifiés**
- `src/components/superadmin/CreateOrgDialog.tsx` — refonte complète (4 champs ci-dessus).
- `src/components/superadmin/EditOrgDialog.tsx` — ajout champs Tarif + Note client.
- `src/components/superadmin/OrgsTable.tsx` — colonnes Tarif + lien clic sur la ligne, supprimer la colonne projets pour gagner de la place.
- `src/pages/SuperAdminOrgDetail.tsx` — **nouveau**, route `/superadmin/orgs/:orgId`, contient infos org + membres + bouton créer user contextualisé.
- `src/components/superadmin/CreateUserInOrgDialog.tsx` — **nouveau**, version simplifiée (org figée, rôle obligatoire, nom obligatoire).
- `src/pages/SuperAdmin.tsx` — retirer `<CreateUserDialog>` du header de l'onglet Utilisateurs (l'onglet reste consultatif).
- `src/App.tsx` — ajout route `/superadmin/orgs/:orgId` protégée par `SuperAdminRoute`.
- `src/integrations/supabase/types.ts` — régénéré auto après migration.

### Hors champ

- L'ancien `CreateUserDialog` (création depuis l'onglet global) est supprimé : si besoin futur de créer un user sans org on le réintroduira.
- Pas de page de détail utilisateur séparée (l'édition reste via `EditUserDialog`).
- Le format du champ « Tarif » reste libre (pas de validation montant/devise) — affiné si besoin plus tard.

