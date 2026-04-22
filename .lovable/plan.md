

## Bug : relances IA qui se superposent à la question suivante

### Cause

Dans `src/pages/InterviewStart.tsx` :

1. `handleSendResponse` (qui déclenche la décision IA puis la relance ou la transition) **ne met jamais `isProcessing` à `true`**. Pendant qu'il attend la fin de la TTS de relance (`await speak(aiMessage)` ligne 1233), le bouton « Passer la question » reste actif.
2. `handleSkipQuestion` annule bien la TTS du navigateur (`window.speechSynthesis.cancel()`) mais **n'arrête pas l'audio ElevenLabs en cours** (`elevenAudioRef.current` n'est pas mis en pause). Si la voix ElevenLabs est activée (cas par défaut), la relance continue à parler par dessus la transition « Passons à la question suivante ».
3. Même quand l'audio est coupé, `handleSendResponse` continue son exécution après l'`await` (il appelle `startQuestionRecording` / `startListening` sur l'ancienne question) en parallèle de la nouvelle question lancée par le skip → état STT corrompu.

### Correctifs (un seul fichier : `src/pages/InterviewStart.tsx`)

#### 1. Couper l'audio ElevenLabs dans le skip

Dans `handleSkipQuestion`, juste après le `window.speechSynthesis?.cancel()` existant, ajouter la coupure de la voix ElevenLabs :
```
if (elevenAudioRef.current) {
  try { elevenAudioRef.current.pause(); } catch {}
  elevenAudioRef.current = null;
}
setIsSpeaking(false);
```

#### 2. Jeton d'annulation pour interrompre une relance IA en cours

Ajouter un `turnAbortRef = useRef<{ aborted: boolean } | null>(null)`.

- Au début de `handleSendResponse` : créer un nouveau jeton `const token = { aborted: false }; turnAbortRef.current = token;` et passer ce jeton aux étapes critiques (vérifier `token.aborted` après chaque `await speak(...)`, après l'appel IA, et avant tout `startListening` / `setCurrentQuestionIndex` / `setMessages` qui suivent).
- Au début de `handleSkipQuestion` : marquer `if (turnAbortRef.current) turnAbortRef.current.aborted = true;`.
- Dans `handleSendResponse`, dès qu'on voit `token.aborted === true`, on `return` immédiatement sans modifier l'état (la nouvelle question est déjà gérée par le skip).

#### 3. Protéger `handleSendResponse` avec `isProcessing`

- Au tout début : `if (isProcessing) return;` puis `setIsProcessing(true);`.
- Dans le `finally`, remettre `setIsProcessing(false);` **sauf** si on a abandonné (pour ne pas écraser l'état remis par le skip).

Ça désactive automatiquement le bouton « Passer la question » pendant le traitement IA et la TTS de relance, évitant le double-clic. Mais comme on veut quand même pouvoir interrompre (cf. demande utilisateur « quand on clic sur passer à la question suivante il faut couper les relances »), le bouton « Passer » doit rester cliquable même si `isProcessing` est vrai. On va donc :

- Garder `disabled = isProcessing` pour les autres boutons,
- **Mais retirer ce disabled pour « Passer la question »** : il devient toujours cliquable hors `interviewFinished`. Le jeton d'annulation (étape 2) garantit la cohérence d'état.

#### 4. Empêcher la double TTS de transition après skip

Avant de prononcer la transition dans `handleSkipQuestion` (`await speak(transition)` ligne 1417), s'assurer que toute lecture résiduelle est bien stoppée (déjà fait pour browser TTS, on ajoute ElevenLabs en étape 1).

### Ce qui ne change pas

- Logique IA (`ai-conversation-turn`), comptage des relances, niveaux de relance.
- Layout, design, mobile.
- Comportement quand l'IA enchaîne naturellement (pas de skip) : toujours `await speak(...)` avant la question suivante, donc pas de superposition.
- Page de fin, raccourcis clavier, plein écran.

### Hors champ

- Pas de timeout maximum sur la TTS de relance (déjà 20 s côté browser TTS).
- Pas de changement dans le edge function `ai-conversation-turn`.

