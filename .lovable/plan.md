### Objectif
Ajouter un curseur sous le toggle « Flouter l'arrière-plan » pour régler l'intensité du flou (4 px → 24 px, défaut 12 px) dans le composant d'enregistrement vidéo côté recruteur.

### Fichiers modifiés

**1. `src/lib/videoComposer.ts`**
- Transformer la constante `BLUR_PX = 12` en une propriété optionnelle `blurPx` dans `ComposerOptions`.
- Le `renderFrame` utilise `this.options.blurPx ?? 12` pour le `ctx.filter`.
- `setOptions()` accepte `blurPx` et le répercute immédiatement.

**2. `src/components/media/MediaRecorderField.tsx`**
- Étendre l'interface `RecorderPrefs` avec `blurAmount?: number` (défaut 12).
- Ajouter un state `blurAmount` initialisé depuis `localStorage`.
- Persister `blurAmount` dans `localStorage` quand il change.
- Passer `blurAmount` au `VideoComposer` (constructeur + `setOptions`).
- Sous le toggle « Flouter l'arrière-plan », afficher conditionnellement une ligne avec :
  - Un label « Flou » avec la valeur actuelle en pixels.
  - Un `<input type="range" min="4" max="24" step="2">` stylisé Tailwind (fond de la piste avec la couleur `--primary`, thumb arrondi).
  - Le curseur est masqué si `!blurEnabled`.

### Hors périmètre
- Aucun changement côté candidat (`InterviewStart.tsx`).
- Pas de slider pour le logo (hauteur/taille fixes).
- Pas de changement base de données.