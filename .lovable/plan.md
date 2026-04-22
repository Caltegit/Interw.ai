

## Solidification de l'enchaînement des questions

Quatre bugs identifiés, plan de correction ciblé.

### Bug 1 — `isProcessing` coincé à `true` après "Passer"

`handleSkipQuestion` met `setIsProcessing(true)` au début, mais ne le repasse **jamais** à `false`. Résultat : l'écran reste bloqué sur **« Analyse de votre réponse… »** (capture d'écran fournie) et tous les boutons disparaissent (le bouton « Passer » est masqué quand `isProcessing`).

**Fix** : ajouter `setIsProcessing(false)` à la fin de `handleSkipQuestion` (et dans un `try/finally` pour couvrir une éventuelle exception pendant `speak`).

### Bug 2 — Superposition de médias entre les questions

Le même `featuredPlayerRef` est attaché à **deux** `<QuestionMediaPlayer>` différents (un pour la vidéo en colonne gauche, un pour audio/written en colonne droite). Lors d'une transition audio → vidéo, le `ref.current.stop()` agit sur le mauvais composant et l'ancien média continue de jouer par-dessus la TTS de transition.

De plus, le `QuestionMediaPlayer` n'a pas de `key={currentQuestionIndex}`, donc son état interne (`hasFinished`, `progress`, `<audio>` element) survit entre deux questions du même type.

**Fix** :
- Forcer le remontage en ajoutant `key={`q-${currentQuestionIndex}`}` aux deux `QuestionMediaPlayer`.
- Avant chaque transition (`handleSendResponse`, `handleSkipQuestion`), appeler `featuredPlayerRef.current?.stop()` **avant** de changer `currentQuestionIndex` (déjà fait), puis nullifier le ref `featuredPlayerRef.current = null` pour qu'il se rebinde proprement sur le nouveau composant.

### Bug 3 — Bouton « Passer la question » qui disparaît

Le bouton est conditionné à `!isProcessing && currentQuestionIndex < questions.length - 1`. Trois problèmes :
- Bug 1 le masque (corrigé ci-dessus).
- Il disparaît sur la **dernière question**. Or si la STT meurt sur la dernière question (cas du screenshot), le candidat n'a **aucune issue de secours**.
- Il disparaît pendant `isSpeaking` alors que c'est précisément un moment où on voudrait pouvoir passer.

**Fix** :
- Toujours afficher un bouton « Passer la question » quand `!interviewFinished` (y compris sur la dernière → comportement = terminer la session).
- Sur la dernière question, le libellé devient « **Terminer la session** » et appelle `endInterview` au lieu de `handleSkipQuestion`.
- Garder le bouton visible aussi pendant `isSpeaking` (utile pour couper court si l'IA parle trop longtemps).

### Bug 4 — STT qui reste coincée (l'IA ne détecte plus la parole)

Sur Chrome, `webkitSpeechRecognition` peut s'arrêter silencieusement après un long silence ou une perte audio temporaire. Le code actuel auto-restart dans `onend` mais :
- Si `recognition.start()` lève (la session a déjà été arrêtée), on ne tente jamais une nouvelle instance.
- Aucun watchdog ne détecte que la STT est morte alors qu'on est censé écouter.

**Fix** :
- Dans `onend`, si l'auto-restart `recognitionRef.current.start()` échoue (catch), recréer **une nouvelle instance** via `startListening()` au lieu d'abandonner.
- Ajouter un **watchdog de vivacité STT** : pendant la phase d'écoute, si aucun `onresult` n'a été reçu pendant 10 secondes ET que `liveTranscript` est vide, redémarrer la recognition (`stopListening()` + `startListening()`).
- Ce watchdog est posé/clearé dans `startListening` / `stopListening` et reset à chaque `onresult`.

### Bug 5 — Petits durcissements

- `markMediaPresentation` ne fait rien si la question n'a ni audio ni vidéo → ajouter un log warning pour détecter les cas limites.
- Dans `handleSendResponse`, si la STT n'a rien capté (transcript vide) on appelle `startListening()` mais sans relancer `resetSilenceTimer()` → le compteur de silence ne repart pas. Ajouter le reset.

### Fichiers touchés

- **Modifié** : `src/pages/InterviewStart.tsx`
  - `handleSkipQuestion` : `setIsProcessing(false)` final + try/finally
  - JSX : `key={`q-${currentQuestionIndex}`}` sur les 2 `QuestionMediaPlayer`
  - `featuredPlayerRef.current = null` après `stop()` lors des transitions
  - Bouton « Passer / Terminer » toujours visible (conditions assouplies)
  - `startListening` : watchdog de vivacité STT (10s sans `onresult`)
  - `recognition.onend` : fallback recréation d'instance si `start()` échoue
  - `handleSendResponse` (branche transcript vide) : `resetSilenceTimer()`
- **Modifié** : `src/components/interview/QuestionMediaPlayer.tsx`
  - Aucun changement nécessaire si `key` est posé côté parent.

### Hors champ

- Pas de refonte de l'architecture STT (pas de Whisper / Deepgram).
- Pas de changement BDD.
- Pas de modification de l'UI globale, seulement les conditions d'affichage du bouton « Passer ».

