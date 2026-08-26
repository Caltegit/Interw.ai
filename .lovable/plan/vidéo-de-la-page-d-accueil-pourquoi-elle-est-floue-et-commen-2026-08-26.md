# Vidéo de la page d'accueil : pourquoi elle est floue et comment la rendre nette

## Ce qui se passe

La page d'accueil propose deux fichiers au navigateur, dans cet ordre :

1. `demo-interwai.webm` — 1920x1080, codec VP8, **522 kbit/s**
2. `demo-interwai-20s.mp4` — 1920x1080, H.264, **1 220 kbit/s**

Chrome, Edge et Firefox prennent **toujours le premier compatible**, donc le WebM à 522 kbit/s. Pour du 1080p avec des textes, des interfaces et des aplats animés, c'est environ 5 à 8 fois trop faible : d'où le fourmillement, les contours baveux et les textes pixelisés. Safari, lui, tombe sur le MP4 et paraît un peu plus propre — mais 1,2 Mbit/s reste faible pour de la capture d'écran.

Dans « Interw V2 Eva » la vidéo semblait plus nette parce qu'elle y était lue dans un cadre plus petit et/ou depuis un rendu moins compressé. Ici, elle est affichée en grand format, ce qui révèle la compression.

Bonne nouvelle : la source Remotion (`remotion-landing/`) est dans le projet, donc on peut **re-générer la vidéo depuis l'original**, sans repasser par un fichier déjà compressé.

## Le plan

### 1. Re-rendu depuis Remotion (qualité maîtrisée)
Re-générer la vidéo à partir du projet Remotion en 1080p, avec un encodage de haute qualité (CRF bas, profil adapté aux captures d'écran et au texte). Aucun ré-encodage d'un fichier déjà dégradé.

### 2. Deux fichiers modernes, bien ordonnés
- Un **WebM VP9** de qualité (au lieu du VP8 actuel) : meilleure netteté à taille égale.
- Un **MP4 H.264** de secours pour Safari et les anciens navigateurs.
- Ordre des `<source>` corrigé pour que le navigateur choisisse toujours le meilleur fichier disponible, jamais le plus dégradé.

Cible : environ 3 à 5 Mbit/s, soit un fichier de l'ordre de 15 à 25 Mo pour 33 secondes.

### 3. Compenser le poids sans abîmer l'expérience
- Affiche fixe (poster) nette affichée immédiatement, la vidéo démarre derrière.
- Chargement différé : la vidéo ne se télécharge que lorsqu'elle entre à l'écran.
- Rendu pixel-perfect (pas d'étirement, pas de lissage inutile) dans le conteneur.

### 4. Option, si le poids devient gênant
Réduire la durée de la boucle d'accueil (par exemple 12 à 15 secondes au lieu de 33) : on garde une définition élevée pour un fichier deux fois plus léger, et une boucle plus percutante côté vente.

## Vérification
- Comparaison avant/après en captures d'écran à taille réelle sur la page d'accueil.
- Contrôle du fichier réellement chargé par le navigateur (le bon fichier, le bon débit).
- Contrôle du temps d'affichage initial de la page.

## Détails techniques
- Rendu : `remotion render` sur la composition de `remotion-landing/src`, sortie ProRes ou H.264 CRF 16.
- Encodages finaux : VP9 (`libvpx-vp9`, CRF ~30, `-row-mt 1`, two-pass) et H.264 (`libx264`, CRF ~20, `preset slow`, `-tune stillimage`, `yuv420p`, faststart).
- `<video>` : `preload="none"` + `IntersectionObserver` pour le déclenchement, `poster` régénéré depuis la première frame du nouveau rendu.
- Fichiers touchés : `public/demo-interwai*.{webm,mp4}`, `public/tuto-poster.png`, `src/pages/Landing.tsx`.
