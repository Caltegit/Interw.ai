

## Améliorer l'upload de la photo recruteur : popup avec aperçu + recadrage

### Ce qui existe aujourd'hui

Un simple bouton « Télécharger » qui prend le fichier brut tel quel. Pas d'aperçu avant validation, pas de recadrage, pas de drag & drop, pas de contrôle de taille/format. Si l'image est rectangulaire ou mal cadrée, elle s'affiche déformée dans le rond.

### Ce que je propose

Une vraie expérience d'upload en deux temps via une popup dédiée.

#### Étape 1 — Sélection du fichier

Une popup (`Dialog`) qui s'ouvre au clic sur « Télécharger » et qui propose :

- Une **grande zone de drop** centrale avec icône upload, texte « Glissez une image ici ou cliquez pour parcourir ».
- État visuel quand on survole avec un fichier (bordure et fond qui changent).
- Support du **collage depuis le presse-papier** (Ctrl/Cmd+V) — pratique pour les screenshots LinkedIn.
- Validation à la volée : formats acceptés (JPG, PNG, WebP), taille max 5 Mo. Message d'erreur clair si refus.

#### Étape 2 — Recadrage circulaire

Une fois l'image chargée, la popup bascule sur l'écran de recadrage :

- **Aperçu de l'image** avec un masque circulaire (l'avatar étant rond partout dans l'app).
- **Zone de crop déplaçable** à la souris/au doigt.
- **Slider de zoom** (1× à 3×) pour cadrer serré sur le visage.
- **Bouton « Pivoter 90° »** au cas où la photo est de travers (commun depuis mobile).
- **Aperçu live** du rendu final en petit (taille réelle de l'avatar, ~80px) à côté du cropper.
- Boutons : `Annuler` / `Choisir une autre image` / `Valider`.

À la validation, l'image recadrée est exportée en **JPEG carré 512×512** (qualité 0.9) pour un poids et une qualité maîtrisés, puis envoyée à `onUpload(file)` comme aujourd'hui — aucun changement côté `ProjectForm` / `ProjectEdit`.

### Détails techniques

- **Nouveau composant** `src/components/project/AvatarUploadDialog.tsx` qui encapsule toute la logique (drop, paste, crop, export).
- **Bibliothèque** : `react-easy-crop` (~15 Ko, pas de dépendances lourdes, gère touch + zoom + rotation nativement, masque circulaire intégré). Export final via `canvas.toBlob()` pour produire un `File` propre.
- **Modification minimale d'`AvatarPicker.tsx`** : remplacer le `<label><input type=file/></label>` par un bouton qui ouvre la nouvelle dialog. Le reste (presets, animaux, photos, clear) reste identique.
- Drag & drop natif via les events `onDragOver` / `onDrop` sur la zone de la popup, plus support du paste via `window.addEventListener('paste', …)` actif uniquement quand la dialog est ouverte.
- Garder l'export comme JPEG (et non PNG) même si l'original est PNG : on évite les avatars de plusieurs Mo et c'est cohérent avec l'usage (pas de transparence nécessaire).

### Ce qui ne change pas

- L'API publique d'`AvatarPicker` (mêmes props `value`, `onSelectPreset`, `onUpload`, `onClear`).
- Les presets (photos réelles, animaux, avatars dessinés).
- Le flux d'upload Storage côté `ProjectEdit` / `ProjectNew`.
- Le rendu final de l'avatar dans le reste de l'app.

### Hors champ

- Filtres / retouches (luminosité, N&B…).
- Détection automatique du visage pour pré-cadrer (nice-to-have plus tard).
- Recadrage des avatars presets — ils sont déjà optimisés.

