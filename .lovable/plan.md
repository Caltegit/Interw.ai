## Objectif

Donner au super admin une vue unique sur **toutes les sessions** (toutes organisations) pour suivre en temps réel le pipeline complet : session → transcript → rapport → email candidat. Recherche ouverte, filtres, et toutes les actions de réparation accessibles ligne par ligne.

## 1. Entrée menu

Dans `src/components/AppSidebar.tsx`, ajouter pour `isSuperAdmin` un item **"Sessions queue"** (icône `ListChecks` ou `Activity`) juste **après "Santé emails"**, route `/admin/sessions-queue`.

## 2. Nouvelle page `/admin/sessions-queue`

Fichier : `src/pages/AdminSessionsQueue.tsx`, protégée par `<SuperAdminRoute>` (ajout dans `src/App.tsx`).

### Layout
- Header : titre + stats compactes 24h / 7j (total sessions, completed, rapports générés, jobs en échec, emails échoués).
- Barre de filtres :
  - **Recherche ouverte** (debounced 300ms) : matche nom candidat, email candidat, titre projet, nom org, session.id, session.token.
  - Filtre statut session (multi : in_progress, completed, cancelled, expired…).
  - Filtre statut job rapport (multi : none, queued, processing, done, failed, cancelled).
  - Filtre santé email (sent / failed / suppressed / none).
  - Filtre organisation (select).
  - Toggle "Démos exclues" (par défaut on).
  - Toggle "Anomalies seulement" (completed sans rapport, ou job failed, ou attempts ≥ 3).
- Tableau paginé (50/page, tri par défaut `sessions.completed_at DESC NULLS LAST, created_at DESC`).

### Colonnes (tout pour bien suivre)
1. Candidat (nom + email)
2. Projet (titre, lien `/projects/:id`)
3. Organisation
4. Statut session (badge)
5. Démarrée / Terminée (timestamps relatifs + tooltip absolu)
6. Transcript (badge : `n/n segments`, vert si complet, ambre si partiel, rouge si vide)
7. Rapport (badge : ✓ généré + lien, ou ✗ + raison)
8. Job rapport (status, attempts/max, next_attempt_at, dernier `last_error` tronqué + tooltip)
9. Email candidat (dernier statut depuis `email_send_log` dédupliqué par `message_id` pour `template_name='candidate-thank-you'`)
10. Actions (menu kebab, voir §3)

Ligne expansible (chevron) : affiche le détail brut du job (`last_error` complet, locked_until, historique des tentatives), le report.id + scores, l'historique email (toutes les rows `email_send_log` liées à la session).

### Auto-refresh
- Polling `useQuery` toutes les 15s + bouton "Rafraîchir".
- Optionnel : abonnement realtime sur `report_jobs` (déjà dans Cloud) pour MAJ instantanée des statuts.

## 3. Actions par ligne (menu déroulant)

Toutes via RPC ou edge function existante, exécutées en tant que super admin :

- **Ouvrir la session** → `/sessions/:id`
- **Ouvrir le rapport** (si existe) → `/sessions/:id` ancré rapport
- **Forcer le job rapport** : reset `attempts=0`, `status='queued'`, `next_attempt_at=now()`, `locked_until=null`. Si pas de job, appelle `enqueue_report_job`.
- **Annuler le job** : `status='cancelled'`, stoppe les retries.
- **Relancer la transcription seule** : invoke `transcribe-session`.
- **Relancer la génération de rapport seule** : invoke `generate-report` (bypass file).
- **Renvoyer le thank-you email** : invoke `send-transactional-email` avec un `idempotencyKey` forcé (suffixe `-manual-<timestamp>`) pour bypasser le verrou 30j.
- **Marquer la session cancelled** (cas sans média) : update `sessions.status='cancelled'`.
- **Copier session.id / token**.

Confirmation `AlertDialog` pour actions destructives (cancel, force).

## 4. Backend

### Nouvelle RPC `admin_search_sessions(...)` (SECURITY DEFINER, vérifie `has_role(auth.uid(),'super_admin')`)

Paramètres : `p_search text, p_session_statuses text[], p_job_statuses text[], p_email_statuses text[], p_org_id uuid, p_exclude_demo bool, p_anomalies_only bool, p_limit int, p_offset int`.

Retourne en un seul appel (jointures côté DB pour éviter le N+1) :
- session (id, token, candidate_name/email, status, started_at, completed_at, is_demo)
- project (id, title)
- organization (id, name)
- transcript_stats (segments_total, segments_with_transcript)
- report (id, overall_score)
- report_job (status, attempts, max_attempts, next_attempt_at, locked_until, last_error, updated_at)
- last_thank_you_email (status, created_at, error_message) — `DISTINCT ON (message_id)` sur `email_send_log` filtré template + recipient.

+ RPC compagnon `admin_sessions_queue_stats(p_window interval)` pour les KPI du header.

### RPC d'action `admin_force_report_job(p_session_id uuid)`
SECURITY DEFINER, vérifie super admin. Upsert/reset le job comme décrit en §3.

### Index nécessaires (si manquants)
- `sessions(completed_at desc, created_at desc)` partiel `WHERE is_demo=false`.
- `email_send_log(template_name, recipient_email, created_at desc)`.

## 5. Hors scope (déjà couvert ailleurs)

- Le worker `process-report-queue`, le trigger d'enqueue, le backoff exponentiel : déjà en place, on les **observe** seulement.
- La page existante `/admin/report-jobs` reste (vue brute par job). La nouvelle page est centrée **session**. On n'ajoute pas encore de fusion : on évaluera après usage.
- Pas d'alerting externe (Slack/email) dans ce lot.

## 6. Vérification

1. Charger `/admin/sessions-queue`, vérifier que les 32 sessions backfillées apparaissent avec leur statut de job courant.
2. Rechercher par email candidat, par titre de projet, par id de session → résultats instantanés.
3. Filtrer "Anomalies seulement" : doit lister les sessions completed sans rapport + jobs failed.
4. Forcer un job failed → vérifier que dans la minute suivante `process-report-queue` le reprend (log côté edge function).
5. Renvoyer un thank-you email à un candidat test → vérifier nouvelle ligne dans `email_send_log` (status sent) et reception.
6. Vérifier que la page renvoie 403/redirige pour un user non super admin.

## Détails techniques

- Stack : React Query (`useQuery` + `useMutation`), shadcn `Table`, `Badge`, `DropdownMenu`, `AlertDialog`, `Input` (search), `Select` (filtres), `Popover` pour multi-select.
- Recherche : ILIKE sur `candidate_name`, `candidate_email`, `projects.title`, `organizations.name` + égalité sur `sessions.id::text`, `sessions.token`. Index trigram `pg_trgm` optionnel sur `candidate_email` si lenteurs (>10k sessions).
- Toutes les invocations edge function passent par `supabase.functions.invoke` avec le JWT du super admin (les fonctions vérifient déjà l'auth ou la clé service).
- Aucune modification des composants RH existants, aucune modification du worker.
