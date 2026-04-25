## Problème
Dans `src/pages/InterviewLanding.tsx`, le bouton « Passer » (ainsi que les autres chemins de sortie de l'écran d'intro) appelle `handleProceedToInterview` qui navigue directement vers la session sans arrêter le média en cours. Résultat : l'audio recruteur, la vidéo ou la TTS ElevenLabs continue à jouer après la navigation.

## Correctif (1 fichier)

**`src/pages/InterviewLanding.tsx`** — fonction `handleProceedToInterview` (ligne 160) :

Avant la navigation, arrêter proprement les trois sources possibles :

1. `introAudioRef.current` → `pause()` + `currentTime = 0`.
2. `introVideoRef.current` → `pause()` + `currentTime = 0`.
3. `ttsAudioRef.current` → `pause()`, `src = ""`, puis libérer (la révocation de l'`objectURL` se fait déjà dans `onended`, on ajoute un `URL.revokeObjectURL` défensif si `src` était un blob).
4. Réinitialiser `mediaPlaying` et `ttsLoading` à `false` pour éviter tout état résiduel si l'utilisateur revient.

Le tout encapsulé dans un `try/catch` silencieux (les refs peuvent être nulles selon le mode d'intro).

## Hors périmètre
- Pas de modification du flux de session ni des autres écrans.
- Pas de changement visuel sur le bouton « Passer ».

## Validation
- Démarrer une intro audio → cliquer « Passer » pendant la lecture → l'audio s'arrête immédiatement.
- Idem pour vidéo et TTS ElevenLabs.
