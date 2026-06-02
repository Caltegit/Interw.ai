## Diagnostic

J'ai téléchargé `q14.webm` (Q15) de 5 candidats du projet : **4 sur 5 sont corrompus** (EBML header parsing failed). Tous démarrent par ~60 KB de données mid-stream avant la vraie en-tête EBML (`1A 45 DF A3`).

En listant les chunks intermédiaires sur Storage, la cause saute aux yeux. Pour Anne Mascarelli par exemple :
- Dossier `q13/` (Q14) : chunks `00000, 00001, …, 00038, 00040, 00042, 00044, 00046, 00047, 00048` (manque 39, 41, 43, 45)
- Dossier `q14/` (Q15) : chunks `00001, 00003, 00005, 00007, …, 00045` (uniquement les **impairs**, le `00000` est manquant)

**Conclusion** : pendant Q15, **deux MediaRecorder tournent en parallèle** (celui de Q14 n'a pas été arrêté avant le démarrage de celui de Q15). Ils partagent :
- `chunkIndexRef.current` (compteur global) → les indices s'entrelacent entre les deux dossiers
- `questionVideoChunksRef.current` (le tableau de blobs servant à reconstruire `q14.webm`) → le recorder Q14 y pousse ses chunks mid-stream avant que le premier chunk EBML de Q15 n'arrive

Résultat : le blob final de Q15 commence par ~1 s de données provenant du recorder Q14 (≈ 60 KB à 500 kbps) → fichier illisible.

Pourquoi Q15 et pas les autres ? Pour les questions intermédiaires, `await stopAndUploadQuestionVideo()` est attendu **avant** `startQuestionRecording()` suivant. Pour la dernière question, la séquence `endInterview` peut déclencher un second `startQuestionRecording()` (via watchdog / `forceStartListening`) pendant que le recorder précédent est encore en train de se vider.

## Correctifs

### 1. Isoler chaque recorder (`src/pages/InterviewStart.tsx`)

Dans `startQuestionRecording` :
- Avant de créer le nouveau recorder, **stopper de force** l'ancien (`questionRecorderRef.current` et `questionAudioRecorderRef.current` s'ils existent) et **détacher leurs handlers** (`ondataavailable = null`, `onstop = null`) pour qu'aucun chunk tardif ne pollue le nouveau buffer.
- Donner à chaque recorder son **propre tableau de chunks** et son **propre compteur d'index** capturés en closure (au lieu des refs partagés `questionVideoChunksRef` / `chunkIndexRef`). Les refs partagés ne servent qu'à pointer sur le tableau du recorder courant pour la lecture par `stopAndUploadQuestionVideo`.

Idem dans `stopAndUploadQuestionVideo` : capturer le recorder et son tableau **localement** en début de fonction, puis nettoyer immédiatement les refs partagés, pour qu'un nouveau `startQuestionRecording` concurrent ne touche pas au snapshot.

### 2. Garde-fou anti-double-démarrage

`startQuestionRecording` log + ignore l'appel si un recorder est déjà `state === "recording"` pour la même `currentQuestionIndex`. Empêche que `forceStartListening` (watchdog) en double avec `onPlaybackEnd` ne redémarre un recorder sain.

### 3. Récupération des Q15 corrompus existants

Étendre `supabase/functions/recover-session-video` pour, en plus de recoller les chunks :
- Scanner le `q{N}.webm` actuel : si présent et non-corrompu, ne rien faire.
- Sinon : recoller les chunks impairs déjà uploadés (`q{N}/chunk-*.webm`) en cherchant le premier offset contenant la magic EBML `1A 45 DF A3` et en tronquant les octets de prefix invalides avant ré-upload.
- Exposer un bouton "Tenter récupération vidéo" dans l'overlay d'erreur du lecteur (déjà en place dans `SessionVideoNavigator.tsx`) qui appelle cette fonction pour le clip concerné, puis refetch.

### 4. Vérification

- Tester en local : enregistrer une session 2 questions, vérifier que les blobs `q0.webm` et `q1.webm` sont valides (`ffprobe`).
- Lancer la récupération sur les 4 sessions corrompues identifiées (Anne Mascarelli, Daniela Amendola, Florian Ozenne, Guillaume Breton) et vérifier que `q14.webm` redevient lisible.

## Fichiers touchés

- `src/pages/InterviewStart.tsx` — fix lifecycle des recorders (points 1 + 2)
- `supabase/functions/recover-session-video/index.ts` — détection EBML + truncate (point 3)
- `src/components/session/SessionVideoNavigator.tsx` — bouton récupération dans l'overlay d'erreur

Aucune migration DB nécessaire.
