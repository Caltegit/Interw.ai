# Barre de chargement fluide entre les questions

## Constat

L'overlay `QuestionLoadingOverlay` reçoit un `percent` qui change par paliers (30 → 60 → 90 → 100) au gré des étapes métier (analyse réponse, préparation, lecture imminente). Visuellement, ça saute.

## Solution

Animer le pourcentage **dans le composant overlay uniquement**, sans modifier la logique métier de `InterviewStart.tsx`.

Le composant maintient un `display` interne qui :
- **rattrape la cible** (`percent` reçu en prop) en douceur via `requestAnimationFrame` (vitesse adaptative ~25 %/s, ease-out)
- **continue de grappiller** lentement (≈ 0,4 %/s, plafonné à `target + 8 %` et 99 % max) tant que la cible n'a pas changé, pour éviter l'impression de blocage entre deux paliers
- **saute net à 100 %** quand la cible atteint 100

Résultat : la barre paraît avancer en continu de 0 à 100 % sans jamais reculer, et accélère naturellement quand le palier suivant arrive.

## Fichier modifié

- `src/components/interview/QuestionLoadingOverlay.tsx` — ajout d'un `useState` + `useEffect` avec boucle `requestAnimationFrame` pour interpoler vers la cible.

Aucune modification dans `InterviewStart.tsx` ni ailleurs.
