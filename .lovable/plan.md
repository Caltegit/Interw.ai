

## Projet démo : copie indépendante par organisation

### Le problème

Aujourd'hui, quand le super admin crée une organisation, le trigger `trg_seed_on_owner_set` exécute `seed_demo_project(_org_id, _created_by)` avec `_created_by = owner_id`. Mais lors de la création d'org via la fonction `superadmin-create-org`, l'`owner_id` est mis temporairement au super admin (pour déclencher le seed) puis remis à `NULL`. Résultat : le projet démo de chaque organisation a `created_by = <super admin>`, alors qu'il devrait appartenir à l'organisation elle-même.

Conséquences concrètes :
- Quand un membre de l'org (ex : `c+7@bap.fr`) ouvre la page candidat connecté, les RLS de `questions` et `projects` filtrent sur `created_by = auth.uid()` → 0 question retournée → bouton « Lancer la session » bloqué.
- Le membre ne peut ni modifier, ni supprimer le projet démo de sa propre organisation.
- Le projet est techniquement « lié » au super admin alors qu'il devrait être autonome dans chaque org.

### Le correctif

**1. Réattribuer les projets démo existants**
Mettre à jour le `created_by` de chaque projet démo existant pour pointer vers l'`owner_id` de son organisation (ou à défaut, le premier admin de cette org). Cela débloque immédiatement c+7 et tous les autres membres.

**2. Corriger le flux de création d'organisation** (`superadmin-create-org`)
Au lieu de s'appuyer sur le trigger `trg_seed_on_owner_set` avec un owner temporaire, créer l'org sans owner (`owner_id = NULL`) et laisser `trg_seed_org_question_templates` faire son travail — ce trigger gère déjà le cas « pas d'owner » et utilisera le super admin comme créateur des **templates** (libraries de questions/critères/templates d'entretien partagés). Mais on **ne** crée **pas** le projet démo à ce moment-là.

Le projet démo sera créé plus tard, dans `accept_invitation`, au moment où le **vrai owner** rejoint l'organisation. Ainsi `created_by` = vrai owner de l'org, pas le super admin.

**3. Adapter `accept_invitation`**
Quand un user accepte l'invitation et devient owner (cas `_current_owner IS NULL`), appeler `seed_demo_project(_org_id, _user_id)` pour créer la copie démo avec lui comme propriétaire.

**4. Élargir les RLS pour éviter ce type de blocage à l'avenir**
Ajouter sur `projects`, `questions`, `evaluation_criteria` des politiques SELECT/UPDATE/DELETE pour les **membres de l'organisation** (pas seulement le créateur). Aujourd'hui seul `created_by` peut éditer un projet, ce qui pose problème dès qu'un autre recruteur de la même org veut intervenir. Politiques ajoutées :
- `Org members can view/update/delete org projects`
- `Org members can manage org project questions`
- `Org members can manage org project criteria`
- `Super admins can view/update all projects/questions/criteria`

Cela respecte le principe « l'organisation possède le projet », pas l'individu.

### Détails techniques

**Migration SQL** :
- `UPDATE projects SET created_by = COALESCE(o.owner_id, ...) FROM organizations o WHERE projects.organization_id = o.id AND projects.title = 'Candidature spontanée - TEST -'` (correctif des données existantes — utilise l'owner si défini, sinon le premier admin de l'org via `user_roles`).
- `CREATE POLICY` sur `projects`, `questions`, `evaluation_criteria` pour les membres de l'organisation et les super admins (SELECT, UPDATE, DELETE — INSERT reste sur `created_by = auth.uid()`).
- Mise à jour de `accept_invitation` pour appeler `seed_demo_project` quand le user devient owner.

**Edge function** `supabase/functions/superadmin-create-org/index.ts` :
- Supprimer le hack « set owner_id puis NULL » — créer directement avec `owner_id = NULL`.
- Le seeding des templates (questions, critères, templates d'entretien) continue via `trg_seed_org_question_templates` qui gère déjà le fallback super admin.
- Le projet démo n'est plus créé ici — il le sera quand le premier owner rejoindra via `accept_invitation`.

**Aucun changement front.**

### Hors champ

- Pas de transfert d'ownership rétroactif des autres projets créés par le super admin pour le compte d'organisations (s'il y en a, à traiter séparément).
- Pas de refonte des politiques `created_by` pour les autres tables (transcripts, reports, sessions) — elles passent déjà par la jointure `projects.created_by`, donc elles bénéficieront des nouvelles politiques d'org via une mise à jour parallèle si besoin (à voir dans un second temps si vous rencontrez le même symptôme côté rapports).

