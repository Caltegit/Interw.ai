# Plan consolidé — fiabilité micro candidat (tout en une fois, sans interférences)

J'ai relu les 15 correctifs ensemble pour identifier les dépendances croisées. Plusieurs étaient redondants ou risquaient de se neutraliser. Je les ai regroupés en **5 chantiers ordonnés**, chacun s'appuyant sur le précédent. Une seule passe d'implémentation, testable à la fin.

---

## Carte des dépendances (lue avant de regrouper)

- **AudioContext singleton** doit exister avant tout le reste : sinon les seuils adaptatifs (chantier 3) et le vu-mètre (chantier 5) restent suspended sur iOS.
- **MIME effectif via `recorder.mimeType`** doit être posé avant la liste de fallback Safari : sinon on corrige la liste mais on continue d'étiqueter le blob avec l'ancienne valeur.
- **Reconstruction propre du MediaRecorder lors d'un switch/réacquisition** doit être en place avant d'ajouter le listener `devicechange` : sinon le listener déclenche un bug pire (recorder zombie).
- **Streaming chunks audio** doit utiliser la même fonction `uploadChunk` que la vidéo et le même MIME effectif : à faire après la fix MIME.
- **Seuils adaptatifs** doivent lire des valeurs stockées par le test technique : le test technique doit donc d'abord persister `peakUser` et `noiseFloor`.
- **Visibilitychange pause/resume** doit cohabiter avec le `pagehide` existant sans le doublonner.

Conséquence : l'ordre des chantiers ci-dessous n'est pas négociable.

---

## Chantier 1 — Socle audio partagé (préalable à tout le reste)

**Objectif : un seul `AudioContext` créé sur geste utilisateur, repris automatiquement, réutilisé partout.**

- Nouveau `src/lib/audioContext.ts` : `getSharedAudioContext()` (singleton lazy, `latencyHint: 'interactive'`, `sampleRate: 48000`) + `ensureAudioContextRunning()` + listener interne `visibilitychange → resume()`.
- Initialisé dès le clic « Commencer l'entretien » dans `InterviewStart.tsx` (dans le même handler que le déblocage TTS).
- `useMicHealthWatcher`, `MicVolumeMeter`, `MicLevelMeter`, `measureMicLevel` : reçoivent ce contexte en option et ne créent plus le leur. Fallback : si l'option n'est pas passée, comportement actuel conservé.
- `buildAudioConstraints` enrichi avec `sampleRate: { ideal: 48000, min: 16000 }`.

**Pourquoi en premier :** corrige iOS muet, conditionne la fiabilité des seuils et du vu-mètre des chantiers suivants.

---

## Chantier 2 — Encodage et MIME : une seule source de vérité

**Objectif : ce qu'on étiquette = ce qu'on a réellement encodé. Plus de blob AAC marqué webm.**

- `getSupportedMimeType` / `getSupportedAudioMimeType` dans `InterviewStart.tsx` :
  - Vidéo : prioriser `video/mp4;codecs=avc1.42E01E,mp4a.40.2`, puis `video/mp4;codecs=avc1,mp4a`, puis webm vp9/vp8, puis fallback nu.
  - Audio : prioriser `audio/mp4;codecs=mp4a.40.2` puis `audio/mp4` quand Safari détecté, sinon webm/opus en tête.
- Après `recorder.start()`, lire `recorder.mimeType` et écraser `recording.videoMime` / `recording.audioMime` avec cette valeur réelle. Utiliser cette valeur pour : `new Blob({ type })`, `uploadChunk(contentType)`, extension Storage (via `extFromMime`).
- Bitrates : `audioBitsPerSecond: 48_000` (entretien) et `64_000` côté `MediaRecorderField` (intro), `videoBitsPerSecond: 800_000` côté `MediaRecorderField`.
- `MediaRecorderField.initCamera` : `getUserMedia` avec `buildAudioConstraints(null)` au lieu de `{ audio: true }` brut. `onMediaReady(blob, url, mimeType)` enrichi pour que les appelants utilisent le MIME effectif.
- `mediaExt.ts` : détection magic bytes (`ftyp`, `OggS`, `1A 45 DF A3`) en fallback si `blob.type` vide.

**Pas d'interférence :** ce chantier ne touche pas le flow de start/stop, juste les étiquettes. Sécurise le chantier 4 (streaming chunks audio) qui repose sur des MIME corrects.

---

## Chantier 3 — Cycle de vie du recorder : switch micro, debranchement, background

**Objectif : ne plus jamais avoir un MediaRecorder qui tourne sur un stream qu'on a muté → cause #1 d'enregistrements silencieux.**

Sous-chantier 3a — **reconstruction propre du recorder** (utilisée par 3b et 3c) :
- Nouvelle fonction interne `restartRecorderWithStream(newStream)` dans `InterviewStart.tsx` :
  1. `recorder.requestData()` puis attendre le `ondataavailable` final
  2. uploader ce chunk partiel via `uploadChunk` (numérotation séquentielle conservée)
  3. `recorder.stop()` proprement
  4. créer un nouveau `MediaRecorder` avec mêmes options et le MIME du chantier 2
  5. recâbler les handlers `ondataavailable` / `onstop` sur le nouveau recorder
  6. `recorder.start(1000)`
- `switchAudioDevice` et `reacquireMic` arrêtent d'utiliser `addTrack`/`removeTrack` sur le stream du recorder et appellent `restartRecorderWithStream(reconstructedStream)`.
- `currentAudioDeviceId` doublé en `useRef` pour être lu immédiatement par les chemins async.

Sous-chantier 3b — **détection débranchement** :
- Listener `navigator.mediaDevices.addEventListener('devicechange', ...)` enregistré une seule fois dans le `useEffect` de boot.
- Sur événement : vérifier `track.readyState` ; si non-`live` → `reacquireMic()` (qui passe maintenant par `restartRecorderWithStream`).

Sous-chantier 3c — **visibilitychange** :
- Sur `hidden` : `recorder.requestData()` puis `recorder.pause()`. Ne touche pas à `pagehide` (qui sert au beacon abandon).
- Sur `visible` : `ensureAudioContextRunning()` puis `recorder.resume()`.
- Garde : ne rien faire si le recorder n'est pas en `recording`.

Sous-chantier 3d — **flush final** :
- Avant chaque `recorder.stop()` planifié (fin de question, fin de session), appeler `requestData()` et attendre le dernier `ondataavailable`. Évite de perdre jusqu'à 999 ms.

**Aucune interférence interne :** 3a fournit la primitive, 3b/3c/3d sont trois consommateurs indépendants.

---

## Chantier 4 — Streaming des chunks audio (parité avec la vidéo)

**Objectif : ne plus perdre l'audio en cas de crash navigateur / OOM mobile.**

- Dans `startQuestionRecording`, l'`audioRecorder.ondataavailable` appelle `uploadChunk` vers `q{n}/audio/chunk-XXXXX.<ext>` (où `<ext>` vient de `extFromMime(recorder.mimeType, 'audio')`).
- Le blob audio consolidé continue d'être uploadé en fin de question (pour rétro-compatibilité de `transcribe-session`), mais devient « best effort » : si l'upload consolidé échoue après 3 retries, on déclenche `recover-session-video` (qui sait déjà reconstruire depuis les chunks — à vérifier côté edge function et étendre si besoin pour l'audio).
- Numérotation des chunks audio synchronisée avec celle de la vidéo pour faciliter la reconstruction.

**Dépend du chantier 2 :** sans MIME correct, les chunks audio uploadés seraient mal étiquetés. Dépend du chantier 3a : si on switch micro en cours de question, `restartRecorderWithStream` continue la numérotation au lieu de la repartir à zéro.

---

## Chantier 5 — Détection vocale adaptative et UX

**Objectif : ne plus auto-pauser un candidat qui parle bas. Lui dire ce qui se passe.**

Sous-chantier 5a — **calibration au test technique** :
- `InterviewDeviceTest.tsx` : pendant les 500 premières ms, mesurer `noiseFloor` (RMS moyen avant que le candidat parle). Après le test, stocker dans sessionStorage à côté de `mic-test-validated:{token}` : `{ peakUser, noiseFloor }`.

Sous-chantier 5b — **seuils adaptatifs dans le watcher** :
- `useMicHealthWatcher` lit ces deux valeurs (nouveau prop optionnel `calibration?: { peakUser, noiseFloor }`).
- `rmsSilenceMax = max(0.008, noiseFloor × 1.5)`
- `VOICE_RMS_THRESHOLD = max(0.015, peakUser × 0.4)`
- Tracking `lastSignalAtRef` : déclenché uniquement par `rms > VOICE_RMS_THRESHOLD` (vraie voix), plus par `rms > rmsSilenceMax` (bruit de fond périodique ne réarme plus le timer indéfiniment).
- Nouveau statut `"too-quiet"` : RMS entre `rmsSilenceMax` et `VOICE_RMS_THRESHOLD` pendant > 15 s.

Sous-chantier 5c — **UX bannière et vu-mètre** :
- `MicFailureBanner` : variante `too-quiet` (« Votre voix est captée mais trop faible. Rapprochez-vous du micro ou changez de périphérique. » + bouton changer micro). Variante `weak` du plan initial fusionnée avec celle-ci pour éviter le doublon.
- `MicVolumeMeter` : si l'`AudioContext` partagé reste suspended après tentative de resume, afficher un overlay « Touchez pour activer le vu-mètre » (réutilise le pattern d'`AudioUnlockOverlay`).

Sous-chantier 5d — **nettoyage check bloquant Firefox** :
- `browserCompat.ts` : retirer `hasSpeechRecognition` des critères `blocked` (la STT live est désactivée depuis le chantier précédent). Le passer en warning silencieux ou supprimer.
- Vérifier `MediaRecorder` présent → downgrade FxiOS en `warning` si présent.

**Dépend des chantiers 1 et 3 :** seuils calibrés inutiles si l'AudioContext est suspended ou si le recorder enregistre dans le vide.

---

## Vérifications post-implémentation (avant de dire « c'est prêt »)

1. **Lint + build** (auto par le harnais).
2. **Playwright headless** sur `tests/e2e/interview-mic-failure.spec.ts` et `interview-start-resume.spec.ts` pour vérifier qu'aucune régression sur les flows existants.
3. **Test manuel scripté** via Playwright : ouvrir un entretien, simuler `visibilitychange` hidden/visible, vérifier que le recorder reprend et qu'un chunk est uploadé après resume.
4. **Lecture des edge functions** `recover-session-video`, `repair-session-media`, `analyze-paraverbal` pour confirmer qu'elles tolèrent le nouveau format de manifest (chunks audio numérotés). Si non → patch minimal côté edge.
5. **Logs ajoutés** : `mic_recorder_restarted`, `mic_devicechange_reacquired`, `mic_visibility_paused`, `mic_visibility_resumed`, `mic_too_quiet`, `mic_calibration_loaded`. Permettront de mesurer l'impact en production.

---

## Ce que je ne fais PAS (volontairement)

- Pas de checksum d'intégrité par chunk (correctif G-3 de l'audit) : coût d'implémentation élevé, gain marginal vu les autres correctifs. À reproposer si on observe encore de la corruption.
- Pas de revue des contraintes vidéo (deviceId exact vs ideal) : hors scope micro, et l'utilisateur a explicitement demandé « micro ».
- Pas de modification du flow `pagehide` / abandon : intentionnellement séparé du visibilitychange pour ne pas changer la sémantique « candidat parti ».
- Pas de réactivation de la STT live : décision produit déjà actée, hors scope.

---

## Estimation et livraison

Un seul commit logique, fichiers touchés :
- `src/lib/audioContext.ts` (nouveau)
- `src/lib/micLevel.ts`, `src/lib/mediaExt.ts`, `src/lib/browserCompat.ts`
- `src/hooks/useMicHealthWatcher.ts`
- `src/pages/InterviewStart.tsx`, `src/pages/InterviewDeviceTest.tsx`
- `src/components/interview/MicFailureBanner.tsx`, `MicVolumeMeter.tsx`
- `src/components/media/MediaRecorderField.tsx` (+ ses 2-3 appelants pour le nouveau `onMediaReady`)
- Éventuellement `supabase/functions/recover-session-video/index.ts` si le manifest audio doit être étendu.

Une fois le plan validé, je passe en mode build et j'enchaîne les 5 chantiers dans l'ordre, sans pause intermédiaire, avec vérifs à la fin.
