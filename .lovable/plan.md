## Problème

Sur la dernière question, quand le candidat clique sur « Ma réponse est terminée » :
1. L'overlay « Analyse de votre réponse… » s'affiche brièvement.
2. Puis il disparaît (ligne 1917 dans `src/pages/InterviewStart.tsx` : `setQuestionLoading(null)`).
3. L'écran de la question redevient visible pendant que l'IA prononce son message de clôture (TTS de plusieurs secondes).
4. Puis seulement, redirection vers `/session/:slug/complete/:token`.

Résultat : un "flash" de l'écran question entre le clic et l'écran de fin, qui paraît cassé.

## Solution

Dans la branche « END » de `handleSendResponse` (`src/pages/InterviewStart.tsx`, ~lignes 1903–1922) :

- **Ne pas masquer l'overlay** avant la fin. Au contraire, mettre à jour son label pour refléter ce qui se passe (« Finalisation de la session… »).
- Garder l'overlay visible pendant tout le `await speak(closing)` du message de clôture.
- L'overlay reste affiché jusqu'à ce que `endInterview()` déclenche la navigation vers la page `InterviewComplete`, qui prend ensuite le relais avec son propre écran « Enregistrement de votre session… ».

Concrètement :
- Remplacer le `setQuestionLoading(null)` de la ligne 1917 par une mise à jour : `setQuestionLoading({ label: "Finalisation de la session…", percent: 95 })`.
- Ne PAS remettre `null` après — `endInterview()` navigue away, le composant est démonté.

## Détails techniques

- Fichier modifié : `src/pages/InterviewStart.tsx` uniquement.
- L'overlay (`QuestionLoadingOverlay`) est déjà rendu plein écran avec `z-[90]`, donc il masque proprement le bloc de la question pendant le TTS final.
- Le composant `InterviewComplete` affiche déjà un loader « Enregistrement de votre session… » tant que `sessions.status !== 'completed'`, donc la transition visuelle sera continue : overlay « Finalisation… » → écran « Enregistrement… » → écran final.
- Aucun changement nécessaire côté `handleSkipQuestion` sur la dernière question : il appelle directement `endInterview()` sans TTS de clôture, donc la redirection est immédiate.

## Hors périmètre

- Pas de modification de `InterviewComplete.tsx` ni de `QuestionLoadingOverlay.tsx`.
- Pas de changement de la logique IA ni de la finalisation en arrière-plan.
