## Audit micro candidat — version révisée (sans risque de faux blocage)

Inquiétude légitime : un `noiseFloor` mal interprété pourrait bloquer un candidat dont le son est en réalité bon. Je révise donc le plan pour qu'**aucune nouvelle mesure ne puisse rejeter un test ni mettre l'entretien en pause à tort**. Le `noiseFloor` n'est utilisé que pour *desserrer* les seuils, jamais pour *durcir*.

### 1. Bug réel à corriger : la calibration de bruit ambiant n'est pas persistée

`InterviewDeviceTest.tsx` enregistre `peak` et `activeMs` mais oublie `noiseFloor`. Du coup `loadMicCalibration()` renvoie toujours `noiseFloor = 0` et le watcher utilise le seuil silence par défaut au lieu d'être adaptatif.

→ Ajouter `noiseFloor: measurement.noiseFloor` dans le payload `sessionStorage`.

**Garde-fou contre les faux positifs** : dans `useMicHealthWatcher`, on bornera l'effet : `effectiveSilenceMax = clamp(noiseFloor × 1.5, base, base × 3)`. Autrement dit, on ne peut que *desserrer* la détection de silence (jamais la durcir au-delà de 3× la valeur par défaut, et jamais la rendre plus stricte que le défaut). Conséquence pratique : impossible de basculer en "silent" plus vite à cause du noise floor.

### 2. Test technique : **AUCUNE nouvelle condition d'échec liée au bruit**

Pas de message « environnement trop bruyant ». On reste sur les critères actuels (peak + activeMs + track live). Le `noiseFloor` n'est qu'une donnée informative persistée pour la session.

### 3. Écouter `track.mute` / `track.unmute`

Aujourd'hui le watcher ne voit pas quand iOS/Android coupent brièvement la piste (notification, bascule Bluetooth, appel). On bascule simplement en "silent" après 30 s.

→ Listeners `mute`/`unmute` dans `useMicHealthWatcher`. Bascule en `track-dead` seulement si `muted` persiste **> 5 s** (pas 3 s) pour éviter de réagir à un blip Bluetooth. Retour `ok` immédiat sur `unmute`.

### 4. `MediaRecorder.onerror` non géré

Aucun handler `onerror` sur les recorders. Sur Safari une erreur tue l'enregistrement silencieusement.

→ Ajouter `recorder.onerror` + `audioRecorder.onerror` : log structuré + tentative de redémarrage via `restartActiveRecorderAfterAudioSwap`. Aucun impact UI sauf si redémarrage échoue.

### 5. Watchdog d'état `MediaRecorder`

Sur Android Chrome bas-de-gamme, `recorder.state` peut passer à `"inactive"` sans `onstop`.

→ Intervalle de 5 s pendant `isListening` : si `state !== "recording"` alors qu'on devrait, redémarrer en préservant `chunkIdxBase`. Idempotent.

### 6. Reprise auto après retour visibilité

iOS Safari peut mettre `MediaRecorder` en `paused`.

→ Dans `onVis` visible : si `recorder.state === "paused"`, appeler `recorder.resume()`. Aucun effet de bord.

### 7. Log des contraintes réellement appliquées

Après `getUserMedia`, logger une fois `track.getSettings()` (sampleRate, noiseSuppression réel, autoGainControl, deviceId). Purement observationnel, aide à diagnostiquer les rapports « voix coupée » a posteriori.

### 8. Mini vu-mètre dans `MicFailureBanner`

Quand la bannière "too-quiet" ou "silent" est affichée, montrer un petit vu-mètre live pour que le candidat voie son niveau en temps réel et s'auto-corrige.

→ Exposer `peak` du watcher, passer à `MicFailureBanner`, afficher 6-8 segments façon `MicLevelMeter`.

### Ce qu'on ne touche pas (déjà solide)

- Singleton AudioContext + resume sur visibilitychange.
- `buildAudioConstraints` (noiseSuppression off, sampleRate 48k).
- Priorité MIME Safari MP4 / Chrome WebM + `recorder.mimeType` source de vérité.
- `restartActiveRecorderAfterAudioSwap` avec `chunkIdxBase` préservé.
- Listener `devicechange` avec réacquisition automatique.
- Upload chunks avec retry/backoff + `requestData` avant stop.
- Suppression de la STT live.

### Récap fichiers

| # | Fichier | Modification |
|---|---|---|
| 1 | `InterviewDeviceTest.tsx` + `useMicHealthWatcher.ts` | Persister `noiseFloor`, l'utiliser uniquement pour desserrer (clamp). |
| 3 | `useMicHealthWatcher.ts` | Listeners `mute`/`unmute` avec délai 5 s avant `track-dead`. |
| 4 | `InterviewStart.tsx` | `onerror` sur les deux recorders + redémarrage. |
| 5 | `InterviewStart.tsx` | Watchdog `recorder.state` (5 s). |
| 6 | `InterviewStart.tsx` | `recorder.resume()` au retour visibilité si paused. |
| 7 | `InterviewStart.tsx` | Log `track.getSettings()` une fois par session. |
| 8 | `useMicHealthWatcher.ts` + `MicFailureBanner.tsx` | Exposer `peak`, mini vu-mètre dans la bannière. |

**Aucun nouveau critère de blocage** : le candidat ne peut pas être rejeté ni auto-pausé à tort à cause de ces changements. Tous les ajouts sont soit purement observationnels (logs), soit assouplissants (calibration qui ne peut que desserrer), soit récupératoires (redémarrage auto).