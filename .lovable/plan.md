## Objectif

Débloquer les 7 sessions ALBO existantes **sans coût GCP**, et supprimer définitivement la dépendance à la voie Files API Gemini direct (responsable des erreurs 429).

Stratégie validée :
- **Rattrapage** : réencoder les segments lourds côté serveur en bitrate bas, puis transcrire via Lovable AI Gateway.
- **Futur** : supprimer la voie Files API, tout passe par la Gateway Lovable, avec une limite de taille assumée par segment.

---

## Étape 1 — Edge function de rattrapage `recompress-segment`

Nouvelle edge function qui prend un `message_id` et :

1. Télécharge le `video_segment_url` depuis Supabase Storage.
2. Réencode via **ffmpeg.wasm** ou un binaire ffmpeg embarqué dans Deno (à confirmer en exploration ; sinon on utilise `mediabunny` côté Deno qui a un wrapper). Cible : WebM/Opus audio uniquement, 64 kbps mono → typiquement **< 2 Mo** pour 2 min.
3. Upload le fichier compressé à côté : `audio_segment_url` (champ déjà présent en DB).
4. Met à jour la ligne `session_messages` avec le nouveau `audio_segment_url` et reset `transcription_status = 'pending'`.

Pourquoi audio : c'est le moyen le plus radical de descendre sous 18 Mo, et la transcription n'a pas besoin de l'image. La vidéo originale reste intacte pour la lecture dans le rapport.

> **Note de faisabilité à valider en build** : Deno edge functions n'ont pas ffmpeg natif. Si ffmpeg.wasm est trop lourd ou trop lent pour la limite 60 s, fallback : on fait le rattrapage via `code--exec` côté sandbox (ffmpeg dispo via `nix run nixpkgs#ffmpeg`), en téléchargeant le segment, le réencodant, puis re-uploadant via service role. Plus simple, pas de nouvelle edge à déployer, traitement one-shot.

**Décision pragmatique** : on fait le rattrapage via **script `code--exec`**, pas d'edge function. C'est ponctuel, ça évite de packager ffmpeg.

### Script de rattrapage (one-shot)

Pour chaque segment des 7 sessions ALBO en `failed` ou `pending` :
1. `curl` le `video_segment_url`.
2. `ffmpeg -i input.webm -vn -c:a libopus -b:a 64k -ac 1 output.webm` → audio mono 64 kbps.
3. Upload dans le bucket `interview-segments` (chemin parallèle, ex. `<session>/<message>-audio.webm`).
4. UPDATE `session_messages` : `audio_segment_url = <new_url>`, `transcription_status = 'pending'`.
5. Appel `transcribe-session` (qui prend déjà `audio_segment_url` en fallback) jusqu'à `remaining = 0`.
6. Appel `generate-report`.

Sessions traitées : Romain HENRY, ros, Sarah De Oliveira, JAMES SCHOUTETEN, Coulondre, Cyrille ROBERT, Christophe santoro v2.

---

## Étape 2 — Simplifier `transcribe-session` (basculer 100% Lovable Gateway)

Dans `supabase/functions/transcribe-session/index.ts` :

- **Supprimer** toute la fonction `callGeminiFilesApiStream` et la dépendance à `GEMINI_API_KEY`.
- **Supprimer** la branche `contentLength > MAX_INLINE_BYTES`.
- Si un segment dépasse 18 Mo : marquer `transcription_status = 'too_large'` (nouvelle valeur explicite) et passer au suivant, au lieu de tenter la voie Files API.
- Garder uniquement `callGeminiInline` via la Gateway Lovable.
- Préférer `audio_segment_url` à `video_segment_url` quand les deux existent (audio est plus petit).

Conséquence : plus aucun risque de 429 Gemini direct. Si un segment est trop gros, il est explicitement marqué et l'UI peut afficher un message clair.

---

## Étape 3 — Cas SUPIOT (session sans aucun enregistrement)

Dans `src/pages/SessionDetail.tsx` :

- Détecter : `messages.filter(m => m.role === 'candidate' && (m.video_segment_url || m.audio_segment_url)).length === 0`.
- Si vrai et `session.status === 'completed'` :
  - Bandeau d'info : « Aucun enregistrement disponible pour cet entretien. »
  - Masquer les boutons « Générer le rapport » et « Re-transcrire ».
  - Afficher bouton **« Supprimer la session »** (destructif, avec `AlertDialog` de confirmation) qui appelle l'edge function `delete-session` existante puis redirige vers la liste candidats du projet.

Dans `supabase/functions/generate-report/index.ts` :
- Garde-fou en début : si zéro segment vidéo/audio → renvoyer 400 `{ error: 'no_recordings' }`. Évite d'appeler Gemini pour rien.

---

## Étape 4 — Indicateur UI pour segments « trop gros »

Dans la page rapport, pour les segments avec `transcription_status = 'too_large'` :
- Badge orange « Segment trop volumineux pour transcription automatique » à côté du message concerné.
- Pas d'action automatique. À l'avenir, on pourra ajouter un bouton « compresser et réessayer » qui appelle un job de réencodage. Hors scope cette itération.

---

## Hors scope (à traiter plus tard si besoin)

- Compression côté candidat (baisser le bitrate du `MediaRecorder`) — utile mais demande tests cross-browser, on garde pour une itération suivante.
- Enregistrement audio séparé côté candidat (parallèle à la vidéo).
- Auto-retry/queue pour 429 Lovable Gateway.

---

## Fichiers modifiés

- **Étape 1** : aucun fichier (script `code--exec` ponctuel).
- **Étape 2** : `supabase/functions/transcribe-session/index.ts` (simplification, ~150 lignes en moins).
- **Étape 3** :
  - `src/pages/SessionDetail.tsx` (détection session vide + UI)
  - `supabase/functions/generate-report/index.ts` (garde-fou no_recordings)
- **Étape 4** : composant rapport (badge `too_large`).
- **DB** : ajouter `'too_large'` à l'enum `transcription_status` si c'est un enum (sinon juste une string, à vérifier en build).

---

## Coûts

- **Rattrapage ALBO** : 0 € côté API (réencodage local + Lovable Gateway inclus).
- **Récurrent** : crédits Lovable AI uniquement (~$0.01-0.04 par segment selon modèle, déjà dans ton plan).
- **Plus jamais** : pas de carte bancaire GCP, pas de quota Files API à gérer.

Dis-moi go pour passer en build.
