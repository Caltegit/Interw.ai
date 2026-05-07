## Cartouche vidéo (SessionVideoNavigator) — réorganisation en-tête

Dans `src/components/session/SessionVideoNavigator.tsx` :

1. **En-tête** : remplacer `{current.questionLabel}` (ex. « Question 9 ») par `Question {index+1} / {clips.length}` à gauche, et la durée `4.53min` alignée à droite via un `flex justify-between`. Le badge « Relance » reste à côté de la durée si applicable.

2. **Bas du cartouche** : retirer le compteur `{index + 1} / {clips.length}` ; les boutons Précédent / Suivant restent et s'écartent (`justify-between` conservé, l'espace vide remplace le compteur — ou on passe en `justify-end`/`gap-2` selon le rendu).

3. Le champ `questionLabel` du clip (« Question 9 ») n'est plus utilisé pour l'affichage mais conservé dans le type pour compatibilité.

### Fichier modifié
- `src/components/session/SessionVideoNavigator.tsx`
