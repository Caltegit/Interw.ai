# Vidéo d'intro illisible sur mobile — diagnostic et plan

## Cause

Les vidéos d'intro sont enregistrées et uploadées en `video/webm` (`MediaRecorder` navigateur, puis upload dans le bucket avec `contentType: "video/webm"` et chemin `presentation/{id}.webm`). **iOS Safari ne lit pas le WebM** : la balise `<video>` affiche l'icône « play barré » visible sur la capture.

Aggravant : dans `src/pages/InterviewLanding.tsx`, `handlePlayMedia` et l'autoplay font `play().catch(() => setMediaFinished(true))`. Sur iPhone, l'échec de lecture est donc masqué et l'écran affiche faussement « Vidéo visionnée » + « Commencer la session », alors que le candidat n'a rien vu.

Confirmé par :
- `src/pages/ProjectNew.tsx` L296-304 : upload `presentation/{id}.webm` / `video/webm`
- `src/pages/ProjectEdit.tsx` L271-281 : idem côté édition
- `src/components/media/MediaRecorderField.tsx` L274 : `mimeType = "video/webm"` côté enregistrement
- `src/pages/InterviewLanding.tsx` L246-254, L341-352 : `setMediaFinished(true)` silencieux sur erreur

## Plan

### 1. Arrêter de mentir au candidat (correctif immédiat, frontend uniquement)

`src/pages/InterviewLanding.tsx` :
- Ne plus appeler `setMediaFinished(true)` quand `play()` échoue. À la place, déclencher un état `mediaError = true`.
- Brancher `onError` sur le `<video>` et le `<audio>` pour passer en `mediaError`.
- Quand `mediaError` est vrai, afficher un message clair : « Lecture impossible sur cet appareil » + bouton **Continuer sans vidéo** (qui appelle `handleProceedToInterview`).
- Pareil dans `src/pages/InterviewDemoLanding.tsx` (même motif de code).

Bénéfice : plus jamais de faux « Vidéo visionnée ». Le candidat peut continuer l'entretien.

### 2. Servir des vidéos lisibles partout (correctif de fond)

Forcer le format **MP4 H.264 / AAC** côté capture et upload, qui est lu par iOS, Android, desktop.

`src/components/media/MediaRecorderField.tsx` :
- Choisir dynamiquement le meilleur `mimeType` supporté par le navigateur, en priorisant MP4 :
  - `video/mp4;codecs=avc1.42E01E,mp4a.40.2` → `video/mp4` → sinon fallback `video/webm`.
- Exposer le mime/extension réels du blob via `onMediaReady` (déjà passé en `blob.type`).

`src/pages/ProjectNew.tsx` et `src/pages/ProjectEdit.tsx` (uploads `presentation/...` et `intro/...`) :
- Déduire l'extension depuis `blob.type` (`.mp4` si `video/mp4`, sinon `.webm`) au lieu de figer `.webm`.
- Passer le `contentType` réel du blob.
- Idem pour les fichiers importés : conserver l'extension/mime d'origine (`.mp4`, `.mov`, `.webm`).

Note : Safari iOS enregistre déjà en MP4 (`MediaRecorder` y supporte `video/mp4`). Chrome desktop enregistrera en WebM mais ces vidéos seront ensuite consultées sur les mêmes navigateurs Chrome côté candidat (problème surtout quand le candidat ouvre depuis iPhone une vidéo enregistrée depuis Chrome desktop par le RH).

### 3. Vidéos déjà uploadées en .webm (existant)

Aucune migration automatique dans ce lot. Deux options à valider :
- **(a)** ne rien faire — les RH ré-enregistreront leurs intros, et le correctif #1 évite la fausse validation.
- **(b)** ajouter un transcodage serveur (edge function + ffmpeg) pour convertir les `.webm` existants en `.mp4`. Plus lourd, à faire dans un second lot si besoin.

## Hors scope

- Pas de modification du schéma BDD.
- Pas de transcodage navigateur (ffmpeg.wasm) : trop lourd pour un correctif rapide ; on s'appuie sur le `MediaRecorder` MP4 natif de Safari.
- Pas de retouche du player des questions (`QuestionMediaPlayer`) : le bug rapporté concerne l'intro projet.

## Vérification

1. Recharger `interw.ai/interview/<slug>` sur iPhone Safari, projet avec vidéo d'intro existante : doit afficher « Lecture impossible » + bouton Continuer, plus jamais « Vidéo visionnée » par erreur.
2. Ré-enregistrer une intro depuis iPhone (Safari) : upload `.mp4`, lecture OK sur iPhone et sur desktop.
3. Ré-enregistrer une intro depuis Chrome desktop : si MP4 supporté → `.mp4`, sinon `.webm` (lecture OK desktop, le candidat iPhone tombera sur le message d'erreur du #1 jusqu'à ré-enregistrement).
