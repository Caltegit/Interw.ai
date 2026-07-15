# Régression upload media — cause identifiée + correctif

## Verdict de l'audit : cause quasi-certaine trouvée

**Chronologie exacte :**

| Date | Uploads `storage.objects` `interviews/*` | Événement code |
|---|---|---|
| ≤ 2026-07-08 | 300 à 3 300 objets/jour, sessions saines | — |
| **2026-07-08 13:41** | — | **Commit `46df84d8` : bump `@supabase/supabase-js` `^2.102.1` → `^2.110.1`** |
| 2026-07-08 (fin de journée) | 1 789 objets (sessions démarrées avant déploiement) | — |
| 2026-07-09 → 2026-07-14 | **0 objet**, 100 % des sessions annulées | — |
| 2026-07-15 | 25 (tests internes) | — |

Le bump embarque `@supabase/storage-js@2.110.1`, qui a introduit une **nouvelle dépendance `iceberg-js@^0.8.1`** et réécrit le chemin d'upload (chunked/resumable). C'est la seule modification de comportement runtime datée du 8 juillet capable d'affecter *tous* les candidats.

**Preuves complémentaires que le serveur va bien :**
- Test `curl` anon `POST /storage/v1/object/media/interviews/…` → **200 OK** (upload accepté).
- Test `curl` anon `PATCH /rest/v1/sessions?id=eq.<sid>` avec `status='in_progress'` + `started_at` → **200 OK**.
- Policies RLS `Anon can upload media`, `Anon can update sessions on active projects` en place, projets `active`.
- Bucket `media` toujours public, pas de `file_size_limit`.
- Migrations 08–09 juillet ne touchent que `organizations`, `password_reset_codes` et des policies SELECT (jamais INSERT storage).

**Ce que j'ai écarté :**
- Le symptôme « `started_at NULL` » n'est **pas** lié : `sessions.started_at` est NULL sur les **546 sessions depuis le 1er mai** — la ligne 2438 de `InterviewStart.tsx` est un fire-and-forget déjà buggé mais indépendant.
- La régression ne vient pas d'un patch récent sur `InterviewStart.tsx` : aucun commit entre le 28/06 et le 13/07 sur ce fichier.

## Correctif (par ordre d'exécution)

### 1. Rollback ciblé du SDK Storage (fix immédiat)
Repasser `@supabase/supabase-js` sur la dernière `2.102.x` connue-fonctionnelle :

```
package.json
- "@supabase/supabase-js": "^2.110.1",
+ "@supabase/supabase-js": "2.102.1",
```

Version **pinnée** (pas `^`) pour éviter qu'`update` du lock ne remonte à 2.110 automatiquement. `bun.lock` régénéré. Cible : downgrade uniquement du client SDK, aucune autre dépendance touchée.

### 2. Vérification en Playwright (bloquante avant de conclure)
Avant de dire au user que c'est réparé :
- Ouvrir `/session/<slug>/start/<token>` sur une session de test dans un projet actif (créer une session dédiée via `supabase--insert`).
- Faire tourner ~15 s d'enregistrement pour Q1 (Chromium `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`).
- Vérifier en base :
  - `storage.objects` contient bien `interviews/<sid>/q0/chunk-*.webm`.
  - `session_messages` du candidat obtient un `audio_segment_url` non null.
- Screenshot du réseau (`page.on('response')`) pour confirmer que les `POST /storage/v1/object/media/…` renvoient 200.

Si la validation échoue → passer au plan B (§4).

### 3. Télémétrie serveur légère (défense en profondeur)
Pour ne plus jamais être aveugle sur un échec d'upload en prod côté candidat :
- Nouvelle edge function `log-client-event` (verify_jwt=false, CORS ouvert), écrit dans `public.client_events(session_id uuid, event text, data jsonb, created_at timestamptz)`.
- RLS : INSERT ouvert à `anon` avec `WITH CHECK (EXISTS session sur projet actif)` ; SELECT réservé aux org members + super admin ; GRANTs alignés.
- `src/lib/logger.ts` : quand `event` commence par `interview_`, `fetch()` fire-and-forget vers cette function en plus de la console.
- Événements critiques à instrumenter côté `InterviewStart.tsx` : `interview_recorder_started`, `interview_chunk_upload_failed`, `interview_final_upload_failed`, `interview_no_chunks_after_5s`, `interview_no_media_at_finalize`.

Objectif : sur la prochaine session cassée éventuelle, on saura immédiatement *quelle étape* échoue sans redemander au candidat.

### 4. Plan B si le rollback ne suffit pas
Si l'étape 2 échoue avec le SDK downgradé, la piste devient un problème réseau/CORS spécifique — dans ce cas :
- Reproduire dans Chromium DevTools et lire précisément l'erreur `supabase.storage.from('media').upload(...)`.
- Vérifier si `iceberg-js` (nouvelle dep 2.110) fait un `PUT` chunké différent (endpoint `/upload/resumable` au lieu de `/object`) que la CDN Storage rejette pour anon.
- Envisager de coller sur `2.108.x` puis `2.106.x` par bissection pour identifier la version qui casse.

## Ce que je ne fais PAS
- Aucun rollback des migrations RLS du 8–9 juillet : elles sont saines, testées serveur, non liées.
- Aucune purge des sessions annulées : elles restent en base comme trace ; on décidera après stabilisation si on veut proposer aux candidats de repasser.
- Aucun changement du garde-fou « no media → cancelled » ligne 3491 : c'est un bon filet de sécurité, il continue son travail.
- Aucun refactor du `.update()` fire-and-forget ligne 2438 : bug pré-existant hors du scope de cette régression (à traiter dans un ticket séparé si on veut fiabiliser `started_at`/`last_activity_at`).

## Détails techniques (pour référence)
- Fichier client : `src/pages/InterviewStart.tsx` (recorder 1740-2200, finalize 3480-3510).
- Chemin uploads : `interviews/<sessionId>/q<idx>/chunk-<NNNNN>.<ext>` + `interviews/<sessionId>/q<idx>.<ext>` + `.../thumbnail.jpg`.
- Bucket : `media` (public, INSERT anon `bucket_id = 'media'`).
- Commit à contourner : `46df84d8` (2026-07-08 13:41) — bump supabase-js.
- Table télémétrie à créer : `public.client_events` avec GRANTs standard (`GRANT INSERT ON … TO anon`, `GRANT SELECT ON … TO authenticated`, `GRANT ALL … TO service_role`).

Dès approbation, j'applique §1 immédiatement, je lance §2, et si tout est vert je pose §3 dans la foulée pour éviter la répétition.
