## Bug

Dans `handleSkipQuestion` (`src/pages/InterviewStart.tsx`, ~ligne 2828), la transition « Passons à la question suivante… » est toujours construite et prononcée, sans tenir compte du réglage `ai_question_transitions_enabled` du projet. Le flux normal entre questions (~ligne 2558) respecte bien ce réglage.

## Correction

Aligner `handleSkipQuestion` sur le comportement du flux normal :

1. Lire `ai_question_transitions_enabled` (défaut `true`) depuis `project`.
2. Si transitions désactivées :
   - Question suivante en **texte** → `transition = nextQ.content` (on prononce uniquement l'énoncé).
   - Question suivante en **audio/vidéo** → `transition = ""` (aucune voix IA, le média se lance directement).
3. Si transitions activées : conserver la formulation actuelle.
4. N'appeler `speak(transition)` que si la chaîne n'est pas vide, et ne persister/afficher le message IA que dans ce cas (cohérent avec une transition silencieuse).

Aucune autre modification (pas de changement de DB, d'UI ou de l'edge function).