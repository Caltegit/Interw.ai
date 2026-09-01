# Bandeau « Ils recrutent avec Interw » : logo Gardner + disposition 3+2 + liens clients

## Objectif
1. Ajouter le logo GARDNER (fourni en PJ, `logo_gardner.png`, wordmark bleu marine sur fond blanc) au bandeau de preuve sociale.
2. Passer à une disposition 3 logos sur la première ligne, 2 logos centrés en dessous (au lieu de la grille actuelle à 4 colonnes).
3. Rendre chaque logo cliquable vers le site du client (nouvel onglet).

## Changements

### 1. Asset logo Gardner
- Créer un pointer CDN : `lovable-assets create --file /mnt/user-uploads/logo_gardner.png --filename logo-gardner.png > src/assets/logos/logo-gardner.png.asset.json`
- Import dans `src/pages/Landing.tsx` via `import logoGardnerAsset from "@/assets/logos/logo-gardner.png.asset.json"` puis `logoGardnerAsset.url`.

### 2. `src/pages/Landing.tsx` — section PREUVE
- `BETA_LOGOS` : ajouter une propriété `href` par logo :
  - Morning → https://www.morning.fr/
  - E.Leclerc → https://www.e.leclerc/mag/e-leclerc-fouesnant-pleuven
  - Castalie → https://www.castalie.com/
  - ad's up consulting → https://ads-up.fr/
  - Gardner → https://withgardner.com/
- Chaque logo devient un `<a href target="_blank" rel="noopener noreferrer">` contenant l'`<img>`, avec un léger `hover:opacity-70 transition-opacity`.
- Remplacer la grille `grid-cols-4` par une mise en page en deux lignes :
  - `flex flex-wrap justify-center items-center gap-x-… gap-y-…` avec les 3 premiers logos sur la première ligne et les 2 suivants sur la seconde, centrés (chaque logo dans un conteneur à largeur contrôlée, ex. `basis-1/3` sur desktop / `basis-1/2` sur mobile, centré via `justify-center`).
  - Taille du logo Gardner : hauteur cohérente avec les autres (wordmark large → `max-h-6 sm:max-h-8 md:max-h-9`).

### 3. Vérification
- Capture Playwright desktop + mobile de la section : 3 logos en haut, 2 centrés en bas, liens corrects (vérifier les `href` dans le DOM).

## Hors périmètre
- Pas de changement de fond du logo Gardner (le wordmark est bleu marine sur blanc ; on l'affiche tel quel).
