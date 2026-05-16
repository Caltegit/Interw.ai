## Constat (logs et données)

J'ai épluché les sessions récentes ainsi que les transcripts pour les candidats cités et une dizaine d'autres :

- **Sessions annulées récentes** : ~20 en 2 semaines (BRAGARD, Saki ×2, Mégane Macieira, Leen Khalifeh, Jorge ×2, Edouard Petard ×2, etc.). Une partie cite explicitement le micro ("Apparemment le micro ne fonctionne pas" — BRAGARD).
- **Transcripts dégradés** : plusieurs sessions ont des `audio_segment_url = null` côté `session_messages` alors que la vidéo est OK → l'enregistreur audio dédié a échoué silencieusement (try/catch « non bloquant » dans `startQuestionRecording`). On retombe sur la transcription depuis la vidéo, qui est de moins bonne qualité.
- **Transcripts hors-sujet** (ex. Clem) : la reconnaissance vocale du navigateur capte autre chose (TV, conversation à côté), parce que le micro système n'est pas celui attendu, ou que la voix du candidat n'arrive jamais. La page `/start` ne vérifie jamais en direct que le micro produit du signal.
- **Test technique trop permissif** : `InterviewDeviceTest`
  - lance le test mic 3 s en background sans demander explicitement au candidat de parler ;
  - en cas de silence il passe en `warning` (pas `error`) → bouton « Continuer » reste actif ;
  - le bouton **Passer** (en haut à droite) saute toute la vérification et n'est jamais journalisé (`mark_attempt_proceeded` existe mais n'est appelé nulle part) ;
  - le filet `showSkipPrimary` autorise « Continuer quand même » dès 2 retries, même si le micro est muet.
- **Pendant l'entretien** : un watchdog STT redémarre la reconnaissance après 10 s de silence, mais **ne prévient jamais le candidat**. La RMS du micro n'est pas surveillée — le `MicVolumeMeter` n'est qu'un affichage passif.

## Correctif proposé

Quatre couches qui se renforcent. Tout reste en français, sans franglais.

### 1) Solidifier le test micro (`src/pages/InterviewDeviceTest.tsx`)

- **Test mic guidé et obligatoire** : remplacer le test 3 s en arrière-plan par un test interactif :
  1. Bouton « Tester mon micro » → demande au candidat de **lire à voix haute une phrase courte** affichée à l'écran (ex. *« Bonjour, je suis prêt pour l'entretien. »*).
  2. Fenêtre de capture portée à **6 s** avec compte à rebours visuel et vu-mètre déjà existant.
  3. Critère de succès durci : **pic RMS ≥ 0.10 ET au moins 0.8 s cumulée au-dessus du seuil** (au lieu d'un pic > 0.05).
  4. En cas d'échec : statut `error` (pas `warning`), proposer changement de périphérique + relancer.
- **Vérification immédiate de la piste audio** : après `getUserMedia`, vérifier `audioTracks[0].readyState === "live"` et `!muted`. Si `muted` → message « Votre système a coupé le micro ».
- **Retomber sur le périphérique par défaut** si l'`exact deviceId` mémorisé n'est plus listé dans `enumerateDevices` (au lieu d'échouer en `OverconstrainedError`).
- **Bouton « Passer »** :
  - Si le test micro est en `error`, ouvrir une confirmation : *« Vous risquez de ne pas pouvoir réaliser l'entretien. Continuer quand même ? »*.
  - Appeler `supabase.rpc('mark_attempt_proceeded', { _attempt_id })` pour tracer ces bypass.
- Idem pour « Continuer quand même » (`showSkipPrimary`) : ne plus l'autoriser tant que le micro est en `error`, seulement en `warning`.

### 2) Re-vérifier le micro à l'entrée de la session (`src/pages/InterviewStart.tsx`)

Avant la première question, après `startVideoStream` :

- Mesurer 1.5 s de RMS sur `streamRef.current` (même algo que `MicVolumeMeter`).
- Si RMS reste ≤ 0.01 (seuil silence quasi total) **et** la piste est `muted`, afficher une `Dialog` bloquante :
  > « Aucun son détecté. Vérifiez que votre micro est branché et non coupé, puis reprenez. »
  avec sélecteur de périphérique (`DeviceSelector` déjà existant) et bouton « Réessayer ».
- Si l'utilisateur change de micro, refaire `getUserMedia` avec le nouvel id et relancer la mesure.

### 3) Watchdog audible pendant l'entretien

- Étendre le watchdog STT (lignes 1149-1158 d'`InterviewStart.tsx`) :
  - Mesurer la RMS en parallèle (réutiliser une `AnalyserNode` partagée avec `MicVolumeMeter`).
  - Si **STT idle > 10 s ET RMS moyenne < 0.01 ET non en pause ET non en cours de TTS**, afficher un toast persistant + un bandeau ambre :
    > « Nous ne recevons pas votre voix. Vérifiez votre micro ou cliquez sur Pause. »
  - Le bandeau disparaît dès qu'on capte du signal.
- Ne pas modifier la logique de redémarrage STT, juste lui ajouter cette information visible.

### 4) Sécuriser l'enregistreur audio

Dans `startQuestionRecording` :

- Si `new MediaRecorder(audioStream)` lève, retenter une fois avec mime par défaut (sans `audioBitsPerSecond`) avant de tomber en fallback vidéo.
- Logguer `interview_audio_recorder_failed` (logger existe déjà) pour qu'on puisse mesurer l'incidence.
- À la fin de la 1ʳᵉ question, vérifier que `questionAudioChunksRef.current` n'est pas vide ; si vide ET piste audio `muted` → ré-afficher la `Dialog` bloquante du point 2.

### Notes techniques

- Aucune nouvelle table, aucun changement de schéma. La fonction `mark_attempt_proceeded` est déjà là, on commence simplement à l'appeler.
- Pas d'impact côté RH : seul le parcours candidat évolue.
- Compatibilité Safari iOS : tous les hooks (`AnalyserNode`, `getUserMedia`, `MediaRecorder` avec `audio/mp4`) sont déjà testés ailleurs dans l'app, on réutilise les mêmes patterns.
- Tous les seuils (RMS 0.01 / 0.10, durées 1.5 s / 6 s / 10 s) sont placés dans des constantes en haut des fichiers concernés pour pouvoir être ajustés sans toucher la logique.

## Validation prévue après implémentation

1. Mode incognito → la page `/session/.../test/...` refuse le « Continuer » tant que le micro est en `error`.
2. Sur Chrome desktop, couper le micro système juste avant `/start` → la `Dialog` bloquante s'affiche.
3. Pendant un entretien, mute le micro après la 1ʳᵉ question → bandeau ambre apparaît dans les ~12 s.
4. Vérifier dans `session_attempts` que `proceeded_anyway` se met à `true` quand on force le passage.