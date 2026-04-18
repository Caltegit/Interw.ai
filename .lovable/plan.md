

## Plan : Fiabiliser la mise en pause pendant la lecture de la question

### Diagnostic

Aujourd'hui, le bouton "Mettre en pause" peut être cliqué à n'importe quel moment, y compris pendant que la question (TTS, audio ou vidéo) est en cours de lecture. Cela provoque des erreurs car :

1. **La lecture média continue** en arrière-plan même quand l'UI passe en mode pause → l'event `onPlaybackEnd` se déclenche pendant la pause et casse l'état.
2. **Le watchdog de 8s** continue de tourner pendant la pause → peut forcer `startListening()` alors que le candidat est censé être en pause.
3. **À la reprise**, l'état média est incohérent (à moitié lu, currentTime au milieu, isPlaying désynchronisé).
4. **Le micro/recording** peut avoir été démarré entre temps si la lecture s'est terminée pendant la pause.

### Solution proposée : "Pause = stop net + reprise propre depuis le début de la question"

C'est l'approche la plus robuste et la plus naturelle pour le candidat. Quand il met en pause pendant la lecture :
- On stoppe immédiatement la lecture média
- On annule le watchdog et tous les timers en cours
- On bloque tout enchaînement automatique vers l'écoute
- À la reprise → on **rejoue la question depuis le début** (déclenché par le clic = user gesture, donc pas de blocage autoplay)

### Corrections à appliquer

**1. Exposer `stop()` + `restart()` dans `QuestionMediaPlayer`**
- Étendre le `useImperativeHandle` avec une méthode `restart()` qui fait `currentTime = 0` puis `play()` synchroniquement (pour préserver le user gesture).
- S'assurer que `stop()` met aussi `currentTime = 0` et reset `hasFinished` / `progress`.

**2. Détecter "pause pendant lecture question" dans `InterviewStart.tsx`**
Dans le handler `handlePause` (ou équivalent) :
- Si `isSpeaking` ou `!isListening` (= question en cours de présentation) :
  - Appeler `mediaPlayerRef.current?.stop()` + arrêter le TTS si actif
  - Clear `playbackWatchdogRef` et `manualContinueTimerRef`
  - Set un flag `pausedDuringQuestion = true`
  - Bloquer le déclenchement de `forceStartListening` tant qu'on est en pause

**3. Reprise propre via `handleResume`**
- Si `pausedDuringQuestion === true` :
  - Reset les états (`isSpeaking`, `shouldAutoPlay`, etc.)
  - Appeler **synchroniquement** `mediaPlayerRef.current?.restart()` dans le handler du clic (préserve le user gesture → pas de blocage autoplay sur mobile)
  - Réarmer le watchdog
  - Reset le flag
- Sinon (pause pendant écoute candidat) : comportement actuel inchangé.

**4. Indicateur visuel**
Pendant la pause, afficher discrètement sous le bouton Reprendre : *"La question sera rejouée depuis le début à la reprise"* → le candidat sait à quoi s'attendre, pas de surprise.

**5. Garde-fous supplémentaires**
- Dans `onPlaybackEnd` : si `isPaused === true`, ignorer l'event (la pause a stoppé la lecture, donc tout `ended` qui arriverait est obsolète).
- Dans le watchdog : checker `isPaused` avant de forcer `startListening()`.

### Fichiers modifiés

- `src/components/interview/QuestionMediaPlayer.tsx` : ajouter `restart()` au handle, garantir reset propre dans `stop()`
- `src/pages/InterviewStart.tsx` : logique `handlePause` / `handleResume` distinguant "pause pendant question" vs "pause pendant réponse", flag `pausedDuringQuestion`, garde-fous watchdog + onPlaybackEnd

### Test final

1. Lancer un entretien avec une question vidéo
2. Pendant la lecture de la vidéo, cliquer "Pause" → la vidéo doit s'arrêter immédiatement, pas d'erreur console
3. Cliquer "Reprendre" → la vidéo redémarre depuis le début, l'enchaînement vers l'écoute fonctionne normalement à la fin
4. Refaire le test pendant la lecture audio
5. Refaire pendant le TTS d'une question écrite
6. Vérifier qu'une pause **après** la fin de la question (pendant l'écoute candidat) garde le comportement actuel sans rejouer la question

