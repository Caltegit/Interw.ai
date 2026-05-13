## Diagnostic

Les pictos affichent les initiales parce que `sessions.thumbnail_url` est `NULL` pour 139 sessions sur 187 ayant une vidéo.

**Cause racine** (`src/pages/InterviewStart.tsx`, ligne 2042) :
```ts
const urls = await stopAndUploadQuestionVideo(sessionId, questionIdx);
videoUrl = urls.videoUrl;
audioUrl = urls.audioUrl;
// ⚠️ urls.thumbnailUrl est ignoré
```
La fonction `stopAndUploadQuestionVideo` extrait bien la vignette, l'envoie dans `media/interviews/{sessionId}/thumbnail.jpg` (vérifié en storage : les fichiers existent bien depuis le 10 mai), mais l'URL retournée n'est jamais écrite dans la colonne `sessions.thumbnail_url`. D'où une régression complète à partir du 10 mai (0 thumbnail/jour vs 10–14/jour avant).

## Correctif

### 1. Persister `thumbnail_url` à la première question — `src/pages/InterviewStart.tsx`
Dans le bloc `persistCandidatePromise` (autour de la ligne 2040) :
- Récupérer `thumbnailUrl` du destructuring.
- Étendre le `update sessions` déjà fait pour `video_recording_url` (lignes 2076–2094) afin d'écrire aussi `thumbnail_url` si la session n'en a pas encore.
- Conserver l'idempotence : on n'écrase pas une vignette existante.

### 2. Backfill des 139 sessions existantes
Migration SQL one-shot : pour toute session sans `thumbnail_url` mais dont l'objet `interviews/{id}/thumbnail.jpg` existe dans le bucket `media`, écrire l'URL publique correspondante.

```sql
UPDATE public.sessions s
SET thumbnail_url = 
  current_setting('app.settings.supabase_url', true)
  || '/storage/v1/object/public/media/interviews/' || s.id || '/thumbnail.jpg'
FROM storage.objects o
WHERE o.bucket_id = 'media'
  AND o.name = 'interviews/' || s.id || '/thumbnail.jpg'
  AND s.thumbnail_url IS NULL;
```
(URL construite directement avec le domaine projet ; pas besoin de setting.)

### 3. Vérification
- Recompter `with_video` vs `with_thumb` (cible : ~égal).
- Recharger la page projet → vérifier qu'Hugues, Romain, Hortense, Anne, Élodie affichent bien leur photo.

## Hors scope
- Ré-extraction de vignettes pour les sessions où le fichier n'a jamais été uploadé (avant le 6 mai). On laisse les initiales pour celles-là.
- Refactor de `stopAndUploadQuestionVideo` (la fonction marche, seul l'appelant ignorait la valeur).
