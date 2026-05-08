# Plan RGPD interw.ai — version révisée

## 1. Checkbox de consentement obligatoire

`src/pages/InterviewStart.tsx` (zone ~3070-3100) :
- Ajouter une `Checkbox` shadcn **non pré-cochée** au-dessus du bouton « Lancer la session ».
- Libellé : « J'ai lu et j'accepte les conditions de traitement de mes données personnelles » avec lien « conditions » qui ouvre `ConsentDialog`.
- État local `consentChecked`. Bouton désactivé tant que `!consentChecked`.
- Au moment où la case est cochée, écrire `sessions.consent_accepted_at = now()` (best-effort, non bloquant).
- Retirer la mention « En cliquant, j'accepte… » devenue obsolète.

## 2. Purge des vidéos à 12 mois (sessions conservées)

Objectif : libérer le stockage à 12 mois mais garder le rapport, le transcript et les métadonnées de session.

**Nouvelle edge function** `purge-old-videos` (service-role, pas de JWT côté client) :
- Sélectionne les `sessions` où `completed_at < now() - interval '12 months'` ET (`video_recording_url IS NOT NULL` OU il existe des `session_messages` avec `video_segment_url`/`audio_segment_url`/`video_chunks_manifest_url` non null).
- Pour chaque session :
  - Liste tous les chemins de fichiers depuis `sessions.video_recording_url`, `sessions.audio_recording_url` et tous les `session_messages.video_segment_url` / `audio_segment_url` / `video_chunks_manifest_url`.
  - Appelle `storage.from(bucket).remove([...paths])` (déterminer le bucket réel — sans doute `interview-recordings` à confirmer en exploration).
  - Met à jour la session : `video_recording_url = null`, `audio_recording_url = null`.
  - Met à jour les `session_messages` : `video_segment_url = null`, `audio_segment_url = null`, `video_chunks_manifest_url = null`.
- Insère une ligne dans `data_purge_log` (table créée à l'étape 6) avec `source = 'cron_video_retention'`.

**Cron pg_cron** (via `supabase--insert`) — quotidien à 3h du matin, pointe vers la nouvelle fonction (modèle identique au cron `cleanup-abandoned-sessions-hourly` existant).

⚠ Côté UI (SessionDetail / SessionVideoNavigator) : déjà tolérant aux URLs nulles, mais à vérifier — ajouter un message « Vidéo expirée (conservée 12 mois max) » si nécessaire.

## 3. Email de remerciement de fin d'entretien + page RGPD candidat

### 3a. Nouveau template transactionnel `candidate-thank-you`
Fichier `supabase/functions/_shared/transactional-email-templates/candidate-thank-you.tsx` :
- Props : `{ firstName, jobTitle, orgName, privacyUrl }`.
- Contenu court :
  > Bonjour {firstName},
  > Merci d'avoir passé votre entretien pour le poste de {jobTitle} chez {orgName}.
  > Vos réponses ont bien été enregistrées et seront analysées par l'équipe de recrutement.
  > 
  > Conformément au RGPD, vous pouvez à tout moment consulter les règles de traitement de vos données et demander leur suppression depuis la page suivante :
  > [Bouton] Mes données personnelles → `{privacyUrl}`
- Inscrire dans `registry.ts`.

### 3b. Déclenchement à la fin de l'entretien
Dans `supabase/functions/finalize-session/index.ts` (qui est déjà appelé quand `sessions.status = 'completed'`), après `generate-report`, invoquer `send-transactional-email` :
- `templateName: 'candidate-thank-you'`
- `recipientEmail: session.candidate_email`
- `idempotencyKey: \`candidate-thanks-${sessionId}\``
- `templateData`: prénom (extrait de `candidate_name`), `jobTitle` (depuis `projects.job_title`), `orgName` (depuis `organizations.name`), `privacyUrl` = `https://interw.ai/interview/{token}/privacy`.

Récupérer ces infos via une jointure `sessions → projects → organizations` au début de `processSession`.

### 3c. Nouvelle page publique `/interview/:token/privacy`
Nouveau fichier `src/pages/InterviewPrivacy.tsx`, route ajoutée dans `src/App.tsx` (zone routes candidat, sans `ProtectedRoute`).

Contenu :
- En-tête `CandidateLayout` (cohérent avec les autres pages candidat).
- Section 1 : reprise du contenu de `ConsentDialog` (les 8 sections). Pour éviter la duplication, extraire le contenu dans un composant réutilisable `ConsentContent.tsx` partagé entre `ConsentDialog` et la page.
- Section 2 : « Supprimer définitivement mes données »
  - Texte d'avertissement : irréversible, supprime vidéos, audios, transcript et rapport.
  - Bouton « Supprimer toutes mes données » → ouvre `AlertDialog` (double confirmation).
  - Sur confirmation, appelle une nouvelle edge function `candidate-self-delete` avec `{ token }`.
  - Sur succès : remplace le contenu par un message « Vos données ont été supprimées. ».

### 3d. Nouvelle edge function `candidate-self-delete`
- `verify_jwt = false` (ajout dans `supabase/config.toml`).
- Body : `{ token: string }`.
- Authentifie via le `token` de la session : `admin.from('sessions').select(...).eq('token', token).maybeSingle()`. Si non trouvé → 404.
- Effectue la même cascade que `delete-session` (en mode service-role) **+ suppression des fichiers Storage** (cf. point 4).
- Insère ligne dans `data_purge_log` avec `source = 'candidate_self_request'`, `candidate_email = session.candidate_email`.
- Retourne `{ success: true }`.

## 4. Suppression Storage dans `delete-session` et `candidate-self-delete`

Compléter `supabase/functions/delete-session/index.ts` :
- Avant la cascade BDD, lister tous les chemins :
  - `session.video_recording_url`, `session.audio_recording_url`
  - Tous les `session_messages.video_segment_url`, `audio_segment_url`, `video_chunks_manifest_url`
- Convertir les URLs publiques en chemins relatifs (split sur le segment `/storage/v1/object/public/{bucket}/`).
- Appeler `admin.storage.from(bucket).remove([...paths])` — non bloquant en cas d'erreur (logger seulement).

Réutiliser cette logique (helper partagé dans `_shared/`) dans `candidate-self-delete` et `purge-old-videos`.

## 5. (Annulé)
~~Mention RGPD email convocation~~ — le email de fin d'entretien (point 3) suffit pour l'instant.

## 6. Table d'audit `data_purge_log`

Migration :
```sql
CREATE TABLE public.data_purge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  candidate_email text,
  source text NOT NULL CHECK (source IN (
    'cron_video_retention',
    'recruiter_manual',
    'candidate_self_request',
    'org_deletion'
  )),
  performed_by uuid,
  performed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);
ALTER TABLE public.data_purge_log ENABLE ROW LEVEL SECURITY;
-- Lecture : super-admins uniquement (évite de garder un lien fort vers une org après purge)
CREATE POLICY "Super admins can view purge log"
  ON public.data_purge_log FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()));
-- Écriture : service-role uniquement (depuis les edge functions)
```

Ajouter les inserts dans :
- `delete-session` (source `recruiter_manual`)
- `candidate-self-delete` (source `candidate_self_request`)
- `purge-old-videos` (source `cron_video_retention`)
- `superadmin-delete-org` (source `org_deletion`)

## 7. (Annulé)
~~Mise à jour Privacy.tsx générique~~ — la page `/interview/:token/privacy` (point 3c) joue ce rôle pour les candidats.

---

## Ordre d'exécution

1. Checkbox consentement (15 min) — bloquant légalement
2. Suppression Storage dans `delete-session` + helper partagé (45 min)
3. Table `data_purge_log` + inserts (20 min)
4. Page `/interview/:token/privacy` + composant `ConsentContent` partagé (45 min)
5. Edge function `candidate-self-delete` + double confirmation (30 min)
6. Template + envoi email `candidate-thank-you` dans `finalize-session` (45 min)
7. Edge function `purge-old-videos` + cron pg_cron (45 min)

Total estimé : ~4 h.
