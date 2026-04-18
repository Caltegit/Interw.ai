

## Plan : Solidifier l'enchaînement question/réponse côté candidat

### Diagnostic

**Cause racine commune** des deux bugs : l'enchaînement vers le mode "écoute" (start recording + start listening) dépend uniquement de l'event `onPlaybackEnd` du `QuestionMediaPlayer`. Si cet event ne se déclenche pas, l'interface reste figée sur "Préparation…".

Cas où `onended` ne fire jamais :
1. **Auto-play bloqué** par le navigateur (politique mobile) → `play().catch(() => {})` avale l'erreur silencieusement, aucun fallback.
2. **Vidéo qui buffer** ou erreur réseau pendant la lecture.
3. **Race condition** : `setShouldAutoPlay(true)` déclenche le `useEffect` du player avec un délai de 200ms, mais si la question change avant, l'event est perdu.
4. **Erreur de chargement média** (`onerror` non géré dans le player).
5. **TTS qui se finit normalement mais `setShouldAutoPlay(true)` ne déclenche jamais le `useEffect`** si `autoPlay` était déjà `true`.

### Corrections à appliquer

**1. Watchdog timer dans `InterviewStart.tsx`**
Ajouter un timer de sécurité : après chaque transition (TTS terminé + `setShouldAutoPlay(true)`), si `isListening` n'est toujours pas `true` au bout de **8 secondes**, on force `startQuestionRecording()` + `startListening()` automatiquement.
- Ce watchdog se reset si `onPlaybackEnd` se déclenche normalement.
- Couvre tous les cas où la vidéo/audio ne joue pas ou n'envoie pas `onended`.

**2. Bouton manuel de secours "J'ai bien vu/entendu la question"**
Quand le bandeau "Préparation…" est affiché ET qu'une question média est en cours, afficher après **3 secondes** un petit bouton discret en dessous : *"Continuer →"*. Permet au candidat de débloquer manuellement l'écoute si la vidéo reste figée.

**3. Gestion des erreurs média dans `QuestionMediaPlayer.tsx`**
- Ajouter `onError` sur les éléments `<audio>` et `<video>` qui appelle `onPlaybackEnd?.()` → n'importe quelle erreur média débloque l'enchaînement.
- Dans `doPlay()`, capturer le rejet de `play()` et appeler `onPlaybackEnd?.()` après un court délai si la lecture n'a pas pu démarrer (auto-play bloqué).
- Ajouter `onStalled` et `onSuspend` (avec un timeout de 5s) pour détecter les vidéos qui freezent.

**4. Robustesse du `useEffect` autoPlay**
Le `useEffect` actuel se déclenche sur `[autoPlay, type, audioUrl, videoUrl]`. Si `autoPlay` reste `true` entre deux questions, l'effect ne re-fire pas correctement. Solution : ajouter une clé de "génération" (incrémentée à chaque question) ou réinitialiser `shouldAutoPlay` à `false` côté parent juste avant chaque transition.

**5. Garantir le state propre entre questions**
Dans `handleSendResponse` et `handleSkipQuestion`, avant le `setShouldAutoPlay(true)` :
- Faire `setShouldAutoPlay(false)` puis `setShouldAutoPlay(true)` dans deux ticks pour garantir que le `useEffect` re-déclenche.
- Reset explicite de `isSpeaking` et autres états avant la nouvelle question.

**6. Logs de debug**
Ajouter quelques `console.log` ciblés sur les transitions (`onPlaybackEnd fired`, `watchdog triggered`, `play() failed`) pour pouvoir diagnostiquer en prod si un autre cas pointu surgit.

### Fichiers modifiés

- `src/pages/InterviewStart.tsx` : watchdog, bouton manuel "Continuer", reset propre de `shouldAutoPlay` entre questions
- `src/components/interview/QuestionMediaPlayer.tsx` : `onError`/`onStalled`, fallback si `play()` rejette, garantir que `onPlaybackEnd` est appelé même en cas d'échec

### Test final

Lancer un entretien complet en simulant :
- Une vidéo qui charge bien → enchaînement fluide question→réponse (cas nominal toujours OK)
- Mode "Passer la question" → bien enchaîner sur la suivante
- Désactiver l'auto-play du navigateur → le watchdog doit débloquer après 8s ou le candidat peut cliquer "Continuer →" après 3s
- Simuler une coupure réseau pendant la vidéo → débloquer via watchdog

