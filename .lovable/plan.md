## Contexte

Tu choisis l'option **C** : le partage individuel via `visible_to_user_ids` reste possible, mais **uniquement** entre utilisateurs appartenant à la même organisation que le projet.

**Était-ce le comportement d'origine ?** Partiellement. Avant le correctif Arnaud :
- Le champ `visible_to_user_ids` existait déjà et était utilisé pour filtrer l'affichage côté UI.
- Mais les politiques RLS de `sessions`, `reports`, `session_messages`, `transcripts`, `copilot_threads/messages` ne regardaient QUE l'organisation. Donc un utilisateur d'une autre org listé dans `visible_to_user_ids` voyait le projet mais pas ses données — un état incohérent.

L'option C formalise et sécurise ce qui était implicitement en place : partage fin **à l'intérieur de l'organisation**.

## Changements

### 1. Fonction `has_project_access` — resserrer la règle
Aujourd'hui elle renvoie `true` si l'utilisateur est :
- membre de l'organisation du projet, OU
- créateur du projet, OU
- listé dans `visible_to_user_ids` (peu importe son organisation), OU
- super admin.

Nouvelle règle : la branche `visible_to_user_ids` n'accorde l'accès **que si l'utilisateur est aussi membre de l'organisation du projet**. Les autres branches (membre d'org, super admin, créateur) restent inchangées.

Effet : Arnaud (org SUPER ADMIN) perd l'accès au projet ALBO. Un membre d'ALBO listé dans `visible_to_user_ids` d'un projet ALBO garde son accès restreint.

### 2. Garde-fou côté écriture
Dans l'écran de partage de projet (`ProjectSharing` / endpoint de mise à jour de `visible_to_user_ids` et `report_recipient_user_ids`) :
- Filtrer les utilisateurs proposés à la sélection aux seuls membres de l'organisation du projet.
- Rejeter côté serveur (via un trigger `BEFORE UPDATE` sur `projects`) toute tentative d'ajouter un `user_id` qui n'appartient pas à l'organisation du projet, avec un message d'erreur clair.

### 3. Nettoyage des données existantes
Migration de nettoyage : pour chaque projet, retirer de `visible_to_user_ids` et `report_recipient_user_ids` tout `user_id` qui n'est pas membre de l'organisation du projet. Loguer les entrées retirées (nombre + `project_id`) pour trace.

### 4. Vérifications
- Confirmer via `supabase--read_query` qu'Arnaud n'a plus accès au projet Domaine Chapelle.
- Confirmer qu'un membre d'ALBO listé dans `visible_to_user_ids` d'un projet ALBO garde bien l'accès aux sessions/rapports/copilot.
- Confirmer qu'un membre d'ALBO **non** listé n'a pas accès à un projet à partage restreint.

## Détails techniques

- Migration SQL : redéfinir `public.has_project_access(_user uuid, _project uuid)` (SECURITY DEFINER, inchangé sinon), ajouter trigger `projects_validate_shared_users`, migration de nettoyage `UPDATE projects SET visible_to_user_ids = ...`.
- Front : `src/components/project/ProjectSharing.tsx` (ou équivalent) — filtrer la liste des utilisateurs sur l'organisation du projet.
- Aucune modification nécessaire sur les politiques RLS elles-mêmes : elles continuent d'appeler `has_project_access`, dont la sémantique change.

## Hors périmètre

- Pas de suppression de `visible_to_user_ids` (ce serait l'option A).
- Aucun changement sur les rôles ou l'appartenance multi-organisation.
