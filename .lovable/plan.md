## Objectif
Envoyer automatiquement un email de relance, **une seule fois**, aux candidats qui ont une session `pending` ou `in_progress` inactive depuis **30 minutes**, en utilisant le template fourni.

## Comportement

- Cible : sessions `pending` OU `in_progress`, dont `last_activity_at` (ou à défaut `created_at`) date de plus de 30 minutes et de moins de 24h (garde-fou pour ne pas relancer d'anciennes sessions au premier déploiement).
- Une seule relance par session, suivie via une nouvelle colonne `abandon_reminder_sent_at` sur `sessions`.
- Pas de modification du cleanup à 2h : il continue à finaliser/purger comme aujourd'hui. Une session qui a déjà des médias est récupérée (déjà géré), une session vide est supprimée — dans les deux cas, le candidat a reçu sa relance avant.
- Le lien envoyé pointe vers la route candidat existante : `https://<host>/session/<project.slug>/start/<session.token>`.

## Template email (`candidate-abandon-reminder`)

- **Objet** : `Abandon ? Sur « {{sessionName}} »` (sessionName = nom du projet)
- **Corps** (React Email, stylé indigo cohérent avec les autres templates) :
  - « Bonjour {{prenom}}, »
  - « Il semble que vous ayez abandonné la session : « {{sessionName}} ». »
  - « Vous pouvez cliquer ici pour la recommencer : »
  - Bouton CTA « Reprendre l'entretien » → lien session
  - « À bientôt, »
  - « L'équipe interw »
- Le footer unsubscribe est ajouté automatiquement par l'infra.

## Détails techniques

1. **Migration DB**
   - `ALTER TABLE public.sessions ADD COLUMN abandon_reminder_sent_at TIMESTAMPTZ;`
   - Index partiel `WHERE abandon_reminder_sent_at IS NULL AND status IN ('pending','in_progress')` pour la requête du cron.

2. **Template** `supabase/functions/_shared/transactional-email-templates/candidate-abandon-reminder.tsx`
   - `templateData`: `{ prenom, sessionName, sessionUrl }`
   - Enregistré dans `registry.ts`.

3. **Nouvelle edge function** `send-abandon-reminders/index.ts`
   - SELECT sessions éligibles (statut, last_activity_at < now()-30min, > now()-24h, `abandon_reminder_sent_at IS NULL`, jointure `projects` pour récupérer `name` et `slug`).
   - Pour chacune :
     - Calcule `prenom` à partir de `candidate_name` (premier mot).
     - Construit `sessionUrl` à partir de `SITE_URL` (ou `interw.ai` par défaut) + slug + token.
     - Invoque `send-transactional-email` avec `idempotencyKey = abandon-reminder-${sessionId}`.
     - Met à jour `abandon_reminder_sent_at = now()` en cas de succès d'enqueue.

4. **Cron**
   - Job `pg_cron` toutes les **5 minutes** qui POST sur `send-abandon-reminders` (suivant le pattern existant des autres cron de ce projet ; créé via `supabase--insert`, pas migration).

## Hors-scope (pour rester focalisé)
- Pas de toggle on/off par projet (peut être ajouté plus tard).
- Pas de seconde relance.
- Pas de modification de la durée de cleanup ni de la durée de vie du token.

## Validation
- Tester en abaissant temporairement le seuil à 1 min sur une session de test, vérifier la réception dans la boîte du candidat, vérifier `email_send_log` (dédup sur `message_id`) et que `abandon_reminder_sent_at` est bien posé, puis rétablir 30 min.
