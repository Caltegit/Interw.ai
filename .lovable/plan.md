# Vidéo hero : section dédiée pleine largeur

## Diagnostic

- **Le "cadre" qui reste** : c'est la barre de navigateur (3 points macOS + fausse URL) **à l'intérieur de la vidéo Remotion elle-même**. Aucun CSS ne peut l'enlever — il faut modifier les scènes Remotion et régénérer la vidéo.
- **La vidéo n'a pas vraiment été agrandie** : le conteneur est passé à `max-w-[1280px]` mais sa section parente est toujours `max-w-6xl` (1152 px). La vidéo reste donc plafonnée à 1152 px.

## Ce que je propose

### Option A — Section dédiée pleine largeur (recommandé)
Sortir la vidéo du flux du hero et lui donner sa propre section :

```text
[ Hero : titre + sous-titre + CTA ]
─────────────────────────────────
[ Section vidéo : fond contrasté, pleine largeur ]
   vidéo centrée, vraie largeur 1280 px max
─────────────────────────────────
[ Bandeau preuve (logos) ]
```

1. Nouvelle `<section>` dédiée, fond contrasté (`bg-foreground/[0.03]` ou bande sombre) avec bordures haut/bas pour délimiter visuellement — sans cadre autour de la vidéo.
2. Vidéo centrée à sa vraie largeur max `1280px` (contre ~1100 px utiles aujourd'hui) → **gain réel de taille**, surtout sur desktop.
3. Padding vertical mesuré (`py-10 md:py-16`) : aucun chevauchement avec le hero au-dessus ni le bandeau logos en-dessous.
4. Mobile inchangé en structure : la vidéo prend toute la largeur utile.

### Option B — Juste déplafonner la largeur (minimal)
Garder la vidéo où elle est, passer la section de `max-w-6xl` à `max-w-[1280px]`. Gain identique de taille, mais la vidéo reste "collée" au hero sans respiration.

### Option C — En plus (séparé) : supprimer le cadre interne
Modifier les scènes Remotion (retirer la barre navigateur factice) et régénérer la vidéo. Plus de "cadre" du tout, mais nécessite un re-render vidéo.

## Détails techniques
- Fichier : `src/pages/Landing.tsx` (lignes 320-324)
- Aucun changement de contenu, de traduction ou de comportement vidéo (autoplay, poster, lazy load conservés)
- Vérification : captures Playwright mobile + desktop pour confirmer l'absence de chevauchement

## Question
Tu préfères A (section dédiée) ou B (simple déplafonnage) ? Et je lance C (re-render sans cadre interne) en même temps ou plus tard ?
