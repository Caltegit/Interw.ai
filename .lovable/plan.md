# Vidéo hero : section dédiée pleine largeur

## Principe

Sortir la vidéo du flux du hero et lui donner sa propre section pleine largeur, sans cadre autour de la vidéo.

```text
[ Hero : titre + sous-titre + CTA ]
─────────────────────────────────
[ Section vidéo : fond contrasté, pleine largeur ]
   vidéo centrée, vraie largeur 1280 px max
─────────────────────────────────
[ Bandeau preuve (logos) ]
```

## Modifications (`src/pages/Landing.tsx`)

1. Remplacer la section vidéo actuelle (lignes 320-324, parent plafonné à `max-w-6xl`) par une section dédiée pleine largeur avec fond contrasté (`bg-foreground/[0.03]`) et bordures haut/bas pour la délimiter visuellement.
2. Vidéo centrée à sa vraie largeur max `1280px` (contre ~1100 px utiles aujourd'hui) → gain réel de taille, surtout sur desktop.
3. Padding vertical mesuré (`py-10 md:py-16`) : aucun chevauchement avec le hero au-dessus ni le bandeau logos en-dessous.
4. Mobile : la vidéo prend toute la largeur utile, padding horizontal réduit.

## Hors périmètre

- Pas de modification des scènes Remotion ni de re-render vidéo (le cadre interne "barre navigateur" reste tel quel).

## Vérification

- Typecheck + captures Playwright mobile et desktop pour confirmer la taille gagnée et l'absence de chevauchement.
