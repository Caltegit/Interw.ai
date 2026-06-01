# Plan — Élargir le dropdown de sélection des questions

## Changement
Dans `src/components/session/SessionVideoNavigator.tsx`, passer la largeur du `SelectContent` de `w-[28rem]` à `w-[56rem]` (le double), tout en gardant `max-w-[90vw]` pour ne pas déborder sur petit écran.

## Fichier modifié
- `src/components/session/SessionVideoNavigator.tsx`