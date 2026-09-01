# Plan : Harmonisation responsive des logos clients

## Objectif
Sur mobile, les logos du bandeau « Ils recrutent avec Interw » ne paraissent pas tous à la même échelle visuelle : le logo Gardner ressort trop grand par rapport aux autres.

## Fichier concerné
- `src/pages/Landing.tsx` (section preuve / `BETA_LOGOS`)

## Actions prévues
1. **Reprendre les classes de taille** du logo Gardner pour réduire sa hauteur max en mobile (`max-h-*`) afin de l’aligner visuellement avec Castalie/Morning.
2. **Ajouter une contrainte de largeur max** (`max-w`) sur les logos si nécessaire, afin que les wordmarks larges ne dominant pas la ligne.
3. **Vérifier le rendu mobile** (capture à 393×852 ou similaire) pour confirmer que les 5 logos ont une présence équilibrée sur les deux lignes.

## Non compris dans ce plan
- Aucun changement de contenu (pas de suppression/ajout de logo).
- Aucun changement de lien ou de disposition en deux lignes.
- Aucun travail sur les autres sections de la landing.
