# Bug : la question se lit pendant que l'overlay « Lecture imminente » est encore affiché (clic sur « Passer la question »)

## Cause

Dans `src/pages/InterviewStart.tsx`, `handleSkipQuestion` :
1. monte l'overlay à 70 % avec le libellé « Lecture imminente… »,
2. appelle `speak(transition)` (TTS de transition) pendant que l'overlay est encore visible,
3. déclenche `setShouldAutoPlay(true)` immédiatement après,
4. ne masque l'overlay qu'ensuite via `setQuestionLoading(null)`.

Résultat : la voix/vidéo démarre alors que l'écran de préparation est encore affiché (capture à 70 %).

À comparer avec le flux normal (ligne ~3156) qui passe à 90 % puis fait `setQuestionLoading(null)` AVANT de parler — comportement attendu.

## Correctif

Aligner `handleSkipQuestion` sur le flux normal : tout ce qui est audible doit se produire APRÈS la disparition de l'overlay.

Dans `src/pages/InterviewStart.tsx` (`handleSkipQuestion`, ~3361-3383) :

1. Avant de parler/jouer, passer l'overlay à 100 % avec le libellé « Lecture imminente… ».
2. Laisser un court délai (~250 ms) pour que la barre atteigne visuellement 100 %, puis `setQuestionLoading(null)`.
3. SEULEMENT ENSUITE : `await speak(transition)` puis `setShouldAutoPlay(true)` / `enterListeningPhase(...)`.
4. Conserver toutes les vérifications d'annulation (`skipBlock !== currentBlockIdRef.current`, `isPausedRef.current`) entre chaque étape pour ne pas démarrer une lecture si l'utilisateur a re-cliqué entre temps.

Aucun changement de logique métier, aucun nouveau composant : on réordonne simplement les étapes pour que la TTS de transition et l'autoplay du média s'exécutent après la fin visuelle de l'overlay.

## Vérification

- Cliquer « Passer la question » → la barre va à 100 %, l'overlay disparaît, PUIS la voix/vidéo démarre.
- Tester aussi sur la dernière question (le flux « Finalisation » reste inchangé).
- Tester pause/reprise pendant le skip pour confirmer qu'aucune lecture ne se déclenche après annulation.
