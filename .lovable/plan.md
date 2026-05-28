### Objectif
Réagencer les options vidéo en deux lignes (une par option), avec le curseur d'intensité à droite du toggle « Flouter l'arrière-plan », et ajouter une option « Taille du logo » avec son propre curseur à droite du toggle « Afficher mon logo ».

### Mise en page cible

```text
✨  Flouter l'arrière-plan   [●—]      Intensité  [——●———]  12 px
🖼️  Afficher mon logo        [●—]      Taille     [——●———]  100 %
```

- Chaque option occupe une ligne complète.
- Le curseur n'apparaît que lorsque le toggle correspondant est activé (sinon l'espace reste vide pour conserver l'alignement).
- Sur mobile (sm:), si trop étroit, le curseur passe sous le toggle.

### Fichiers modifiés

**1. `src/lib/videoComposer.ts`**
- Ajouter `logoScale?: number` dans `ComposerOptions` (défaut 1).
- Remplacer la constante fixe par un calcul : `logoH = h * LOGO_HEIGHT_RATIO * (options.logoScale ?? 1)`.
- `setOptions()` propage `logoScale`.

**2. `src/components/media/MediaRecorderField.tsx`**
- Étendre `RecorderPrefs` avec `logoSize: number` (défaut 100, plage 50 → 200, pas 10) ; chargement/sauvegarde dans `localStorage`.
- Ajouter le state `logoSize`, l'inclure dans le `useEffect` de persistance et dans la création/mise à jour du `VideoComposer` (`logoScale: logoSize / 100`).
- Refondre le bloc `VideoOptions` :
  - Conteneur `space-y-2`, chaque option dans une `div` flex avec `justify-between`.
  - Partie gauche : icône + label + switch (groupés dans un flex avec largeur min fixe pour aligner les curseurs).
  - Partie droite : curseur + valeur (rendu conditionnel, sinon un placeholder transparent pour garder la hauteur).
- Le curseur d'intensité reste `min=4 max=24 step=2` ; le curseur de taille `min=50 max=200 step=10`, suffixe `%`.
- Le curseur « Taille » est masqué (ou désactivé) si pas de logo dispo ou si le toggle est off.

### Hors périmètre
- Pas de changement côté candidat ni en base de données.
- Pas de modification du logo lui-même (toujours en haut à gauche, padding inchangé).
