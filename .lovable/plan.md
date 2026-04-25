## Objectif
Sur la page d'accueil (site vitrine), afficher l'image fournie comme première vignette de la vidéo tuto et superposer un gros bouton play pour signaler clairement qu'il s'agit d'une vidéo.

## Modifications

### 1. Ajouter l'image dans `public/`
- Copier `user-uploads://Capture_d_écran_2026-04-25_à_21.40.35.png` vers `public/tuto-poster.png`
- Référencée directement par le `<video poster="/tuto-poster.png">` (pas d'import ES6 nécessaire pour l'attribut HTML natif).

### 2. Mettre à jour `src/pages/Landing.tsx` (section ligne 154-173)
- Créer un petit composant local `TutoVideo` (dans le même fichier) avec `useState` + `useRef` :
  - État `started` (false par défaut).
  - Tant que `!started` : affiche l'image poster + un overlay sombre léger + un gros bouton play circulaire centré (icône `Play` de lucide-react, déjà utilisée dans le projet).
  - Au clic sur le bouton : `setStarted(true)`, puis `videoRef.current?.play()`.
  - Une fois démarré : la vidéo native s'affiche avec ses `controls`.
- Garder `playsInline`, `preload="metadata"`, `poster="/tuto-poster.png"` sur la balise `<video>` pour que l'image soit visible aussi dans les aperçus natifs.
- Aspect ratio préservé via `aspect-video` pour éviter le saut de hauteur.

### 3. Style du bouton play
- Cercle ~80px, fond blanc semi-transparent + blur léger, icône `Play` indigo, ombre douce.
- Hover : légère mise à l'échelle (transform inline, sans `transition-*` Tailwind interdit ? — autorisé ici, on est sur le site React classique, pas Remotion).

## Fichiers touchés
- `public/tuto-poster.png` (nouveau)
- `src/pages/Landing.tsx` (remplacement du bloc `<video>` par `<TutoVideo />` + définition du composant)

Aucune modification backend, aucune dépendance ajoutée.