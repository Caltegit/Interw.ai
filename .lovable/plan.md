## Problème

Les tables `sessions`, `session_messages`, `projects`, `questions` exposent leurs données sans restriction :

- `sessions` : politiques anon ET authenticated en `USING (true)` → **n'importe quel utilisateur connecté voit toutes les sessions de tous les comptes**. C'est ce qui permet à `c+m@bap.fr` de voir les sessions du super admin.
- `session_messages` : `Anon can view session messages` en `USING (true)`.
- `projects` : `Anon can view projects` et `Authenticated can view active projects` en `USING (status = 'active')` → tous les projets actifs visibles par tous.
- `questions` : `Anon can view questions` accessible dès que le projet parent est actif.

Le flux candidat est anonyme (pas de login) et identifié par le `token` présent dans l'URL `/session/:slug/start/:token`. Le code frontend interroge déjà les tables avec `.eq("token", token)`. RLS ne peut pas vérifier qu'un filtre est présent dans la requête → il faut **passer par des RPC `SECURITY DEFINER` token-gated** pour le flux candidat, et fermer l'accès anon direct.

## Correction

### 1. Fermer les politiques trop ouvertes

Sur `sessions`, `session_messages`, `projects`, `questions` :
- Supprimer toutes les politiques `USING (true)` ou `USING (status='active')` pour `anon` et `authenticated`.
- Conserver / s'assurer que les politiques org-scoped restent (membres de l'organisation propriétaire + super admin).
- Pour `projects` : garder une lecture anon **uniquement** sur la page publique `/p/:slugPublic` via `project_public_pages.enabled = true` (déjà gérée séparément) ; la lecture anon directe de `projects` est supprimée.

Effet : `c+m@bap.fr` ne verra plus que les sessions/projets de son organisation Morning.

### 2. RPC `SECURITY DEFINER` pour le flux candidat anonyme

Créer un jeu de fonctions exposées en `anon` qui exigent le `token` :

- `candidate_get_session(_token text)` → renvoie la session (sans champs sensibles RH : `recruiter_note`, `recruiter_decision*`, `assigned_to`).
- `candidate_get_project_bundle(_token text)` → renvoie le projet + ses questions + critères, à condition que `_token` corresponde à une session valide du projet.
- `candidate_update_session(_token text, _patch jsonb)` → autorise uniquement la mise à jour de colonnes "candidat" listées en dur (`status`, `started_at`, `completed_at`, `last_question_index`, `last_activity_at`, `consent_*`, `video_viewed_at`, `audio_recording_url`, `video_recording_url`, `duration_seconds`, `cancelled_at`, `candidate_*`). Refuse `recruiter_*`, `assigned_to`, `project_id`, `token`.
- `candidate_insert_message(_token text, _role text, _content text, _metadata jsonb)` → insertion contrôlée dans `session_messages`.
- `candidate_get_messages(_token text)` → lecture des messages de la session.

Chaque fonction commence par : `SELECT id INTO _sid FROM sessions WHERE token = _token` et lève `RAISE EXCEPTION` si introuvable. `search_path = public`, `SECURITY DEFINER`, `GRANT EXECUTE TO anon, authenticated`.

### 3. Adapter le code frontend candidat

Remplacer dans `InterviewLanding.tsx`, `InterviewDeviceTest.tsx`, `InterviewStart.tsx`, `InterviewComplete.tsx`, `InterviewPrivacy.tsx` :

- `supabase.from("sessions").select(...).eq("token", token)` → `supabase.rpc("candidate_get_session", { _token: token })`.
- `supabase.from("sessions").update(patch).eq("id", sid)` → `supabase.rpc("candidate_update_session", { _token, _patch: patch })`.
- Lecture projet/questions → `candidate_get_project_bundle`.
- `session_messages` insert/select → RPC dédiés.

Côté RH (pages protégées), aucun changement : les requêtes passent par les politiques `authenticated` org-scoped déjà en place.

### 4. Vérifier `reports` et `transcripts`

- `reports` : déjà correctement org-scoped pour `authenticated`. Lecture anon via `report_shares` OK (token de partage).
- `transcripts` : déjà org-scoped. Pas de lecture anon directe nécessaire (le candidat n'y accède jamais).

### 5. Tests de non-régression

- E2E `candidate-journey.spec.ts` : doit continuer à passer (landing → device test → start).
- Manuel : se connecter en tant que `c+m@bap.fr`, vérifier que seules les sessions Morning apparaissent.
- Manuel : ouvrir un lien candidat en navigation privée, vérifier que l'entretien se déroule normalement.

## Détails techniques

```text
Tables touchées (RLS) :
  sessions          : DROP 4 policies anon/auth open ; conserve org-scoped
  session_messages  : DROP anon select/insert open  ; conserve org-scoped
  projects          : DROP anon + auth active-status open
  questions         : DROP anon open

Fonctions créées (public, SECURITY DEFINER, search_path=public) :
  candidate_get_session(_token text) returns sessions
  candidate_get_project_bundle(_token text) returns jsonb
  candidate_update_session(_token text, _patch jsonb) returns void
  candidate_get_messages(_token text) returns setof session_messages
  candidate_insert_message(_token, _role, _content, _metadata) returns uuid

Whitelist update colonnes candidat (anti-escalation):
  status, started_at, completed_at, last_question_index,
  last_activity_at, consent_given_at, consent_accepted_at,
  video_viewed_at, audio_recording_url, video_recording_url,
  duration_seconds, cancelled_at, candidate_name, candidate_email,
  candidate_linkedin_url, candidate_cv_url, candidate_cv_filename
```

Edge functions (`finalize-session`, `transcribe-session`, etc.) utilisent la `service_role` key → non impactées par le changement de RLS.
