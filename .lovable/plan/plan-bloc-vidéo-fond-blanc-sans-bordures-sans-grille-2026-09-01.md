# Plan — Bloc vidéo : fond blanc, sans bordures, sans grille

## Objectif
Nettoyer la section vidéo de la landing page : fond blanc identique au reste du site, plus de lignes de séparation, et suppression de la grille visible en arrière-plan de la vidéo.

## Diagnostic
La grille n'est pas un style de la page : elle est **incrustée dans la vidéo** elle-même. Elle vient du composant `BackgroundLayer.tsx` du projet Remotion (`remotion-landing/src/components/BackgroundLayer.tsx`, bloc « Subtle grid », lignes 39-48), qui dessine un quadrillage gris sur fond blanc. Il faut donc modifier la vidéo source et la re-générer.

## Changements

### 1. `src/pages/Landing.tsx` — Section vidéo (ligne 322)
- Supprimer `border-y` et `bg-foreground/[0.03]` de la `<section>` vidéo.
- Garder la structure pleine largeur avec conteneur `max-w-[1280px]` (option A déjà en place).
- Résultat : fond blanc continu, sans lignes au-dessus ni en dessous.

### 2. `remotion-landing/src/components/BackgroundLayer.tsx`
- Supprimer le bloc « Subtle grid » (le `div` avec les `linear-gradient` en quadrillage).
- Garder les halos lumineux subtils (ils donnent de la profondeur sans motif visible) — ou les supprimer aussi si tu préfères un blanc totalement pur (à trancher : je propose de les garder, quasi invisibles).

### 3. Re-génération des vidéos
- Re-render Remotion des 2 langues : `demo-interwai-hd.mp4/.webm` et `demo-interwai-hd-en.mp4/.webm` via le script de render existant dans `remotion-landing/scripts/`.
- Remplacer les fichiers dans `public/` du projet principal.
- Re-générer aussi les 2 posters (`demo-interwai-poster.png`, `demo-interwai-poster-en.png`) pour cohérence.

## Vérification
- Captures Playwright desktop + mobile : section vidéo sur fond blanc, aucune ligne de séparation, aucune grille visible dans la vidéo (frame extraite au repos et en lecture).
- Build vert.

## Hors périmètre
- Le bandeau « Ils recrutent avec Interw » (section suivante) garde ses propres bordures : inchangé sauf si tu veux aussi les retirer.
