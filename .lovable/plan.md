# Récupération des 21 candidats + validation bloquante du correctif

## Réponses aux deux garanties demandées

### 1. Zéro envoi automatique — 100 % manuel depuis un écran super-admin

- Nouvel écran `/admin/candidates-to-recover` réservé `SuperAdminRoute`.
- Chaque envoi = clic explicite + dialogue de confirmation.
- Bouton « Renvoyer à tous » = un seul dialogue listant nommément les destinataires cochés, aucune action déclenchée avant ce clic.
- **Aucun cron, aucun trigger, aucun webhook** ne peut déclencher l'envoi. La migration ne crée que la table et les policies ; le déploiement de l'edge function ne l'exécute pas.
- L'edge function `resend-impacted-candidate` refuse tout appel non authentifié en super-admin (garde `requireCallerOrInternal` + `has_role(auth.uid(),'super_admin')` en tête).
- Idempotence : si `session_reinvitations` a déjà une ligne `email_sent_at IS NOT NULL` pour la session d'origine, la function refuse (aucun double envoi possible par erreur).

### 2. Correctif upload — état vérifié, validation end-to-end bloquante

**Vérifié ce soir (RLS en place)** — les 3 policies anon sur `storage.objects` pour `interviews/` existent :

| Policy | Command | Rôle | Condition |
|---|---|---|---|
| `Anon can upload media` | INSERT | anon | `bucket_id = 'media'` |
| `Anon can view interview media` | SELECT | anon | `bucket_id = 'media' AND foldername[1] = 'interviews'` |
| `Anon can update interview media` | UPDATE | anon | `bucket_id = 'media' AND foldername[1] = 'interviews'` |

**Pas encore vérifié** : aucun candidat réel n'a repassé d'entretien depuis 22:20 UTC hier (0 fichier réel dans `storage.objects` sur `interviews/*` depuis le fix). La condition nécessaire est là ; la condition suffisante (PUT MediaRecorder → 200 + `session_messages.video_segment_url` peuplé) reste à prouver.

## Plan (ordre strict d'exécution)

### Étape 0 — Validation end-to-end du correctif (BLOQUANTE)

Test Playwright dédié `tests/e2e/interview-upload-anon.spec.ts` :
1. Créer via `supabase--insert` une session témoin sur un projet actif.
2. Ouvrir l'URL candidat anonyme avec caméra/micro factices (config déjà en place dans `playwright.config.ts`).
3. Enregistrer ~10 s sur la première question.
4. Capturer les réponses réseau `POST/PUT /storage/v1/object/media/interviews/…` et **exiger status 200**.
5. Poller `storage.objects` : au moins 1 fichier > 10 Ko sous `interviews/<sid>/`.
6. Poller `session_messages` : ligne candidate avec `video_segment_url` OU `audio_segment_url` non null.

Si un seul critère échoue → **arrêt total**, on n'écrit ni la migration, ni la function, ni l'écran, ni le template. Aucun candidat n'est relancé tant que ce test n'est pas vert.

### Étape 1 — Migration `session_reinvitations`

Table dédiée pour tracer chaque tentative de re-invitation (audit, idempotence, affichage) :

- `id`, `original_session_id` uuid FK sessions, `new_session_id` uuid nullable FK sessions
- `candidate_email`, `candidate_name`, `project_id`
- `reason` text default `'upload_regression_july_2026'`
- `is_witness` boolean default false (marque les sessions témoins internes pour distinction visuelle)
- `email_sent_at`, `email_status`, `email_message_id`
- `resent_by` uuid (auth user id du super-admin qui a cliqué)
- `created_at`, `updated_at` (trigger `update_updated_at_column`)

GRANTs : `SELECT, INSERT, UPDATE ON authenticated`, `ALL ON service_role`, **pas d'anon**.
RLS : lecture réservée aux super-admins (`has_role(auth.uid(),'super_admin')`), écriture uniquement via service_role.

### Étape 2 — Edge function `resend-impacted-candidate`

Payload : `{ original_session_id: uuid, is_witness?: boolean }`. Comportement :
1. Vérifier super-admin appelant.
2. Charger la session ; **refuser** si un fichier > 1 Ko existe déjà sous `interviews/<sid>/` (session non impactée).
3. **Refuser** si `session_reinvitations` a déjà `email_sent_at IS NOT NULL` pour ce `original_session_id`.
4. Créer une nouvelle session `pending` dans le même projet, copier `candidate_name`, `candidate_email`, `candidate_fields`, générer nouveau `session_token`.
5. Marquer l'ancienne session `cancelled` si encore `pending`/`completed`, ajouter `admin_notes` pointant la reprise.
6. Envoyer l'e-mail via la function transactionnelle existante avec le template §3.
7. Insérer la ligne `session_reinvitations` avec `email_sent_at`, `email_status`, `email_message_id`, `resent_by`, `is_witness`.

### Étape 3 — Template d'e-mail d'excuse (français, sobre)

Objet : « Nous vous invitons à repasser votre entretien »

Corps :

> Bonjour {{prenom}},
>
> Suite à un incident technique survenu entre le 9 et le 15 juillet, votre entretien pour le poste « {{poste}} » chez {{entreprise}} n'a pas pu être enregistré. Nous en sommes sincèrement désolés.
>
> Nous vous invitons à le repasser via le lien ci-dessous. Vous disposez de 7 jours.
>
> {{cta_link}}
>
> Si vous rencontrez la moindre difficulté, répondez à cet e-mail — nous vous accompagnons.
>
> L'équipe Interw

### Étape 4 — Écran `/admin/candidates-to-recover`

Sous `SuperAdminRoute` uniquement.

**Zone A — Candidats témoins (haut de page, section « Tester avant d'envoyer »)** :
- Champ « Ajouter un candidat témoin » : nom + e-mail + choix du projet actif → bouton « Créer session témoin ».
- Chaque témoin créé apparaît dans une liste dédiée avec :
  - Lien candidat (à ouvrir dans un navigateur privé pour tester le parcours réel)
  - Bouton « Copier le lien »
  - Bouton « Envoyer l'invitation à cet e-mail » (utilise la même function que la campagne, avec `is_witness: true`)
  - Statut live : `pending` / `in_progress` / `completed` + nombre de fichiers réels uploadés (poll 5 s)
  - Badge vert « Upload OK » dès qu'un fichier > 10 Ko apparaît sous `interviews/<sid>/`
- Ajouter autant de témoins que voulu (aucune limite) — utile pour tester sur plusieurs postes, plusieurs navigateurs, plusieurs collègues.

**Zone B — Les 21 candidats impactés** :
- Tableau : date, nom, e-mail, projet, statut session d'origine, colonne « Renvoyé le » (depuis `session_reinvitations`).
- Bouton « Renvoyer » par ligne → dialogue de confirmation → appel edge function.
- Bouton « Renvoyer à tous » en haut → dialogue listant les destinataires nom + e-mail, cases à décocher individuellement possibles → itération côté function.
- Filtres : « À renvoyer » (défaut) / « Déjà renvoyés » / « Tous ».
- Toast succès/échec par candidat.

### Étape 5 — Campagne

Après validation visuelle de l'écran par toi :
- Créer 2 à 3 témoins (toi + collègues), tester chaque parcours de bout en bout, confirmer les fichiers en base.
- Puis clic « Renvoyer à tous » depuis ton compte super-admin, quand tu le décides.

## Ce que ce plan ne fait toujours PAS

- Aucun envoi automatique, aucun cron, aucun trigger.
- Aucune tentative de reconstruction de média (impossible, 0 fichier réel côté serveur).
- Aucune modification du parcours candidat standard (le correctif RLS d'hier suffit).
- Aucun changement du template d'invitation standard (seul un template d'excuse dédié est ajouté).

## Ordre récapitulatif

0. Test Playwright end-to-end → **doit être vert**
1. Migration `session_reinvitations` (avec flag `is_witness`)
2. Edge function `resend-impacted-candidate`
3. Template d'e-mail d'excuse
4. Écran `/admin/candidates-to-recover` avec zone témoins multiples + zone campagne
5. Envoi manuel par toi, après tests témoins concluants
