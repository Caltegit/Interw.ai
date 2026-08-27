# Plan : libérer l'espace de la vidéo en sortant le bloc « Ils recrutent avec Interw » du fold figé

## Contexte actuel
Dans `src/pages/Landing.tsx`, le hero, la vidéo et le bloc de logos partagent un même conteneur à hauteur fixe :

```text
<div className="flex flex-col md:h-[calc(100dvh-4rem)]">   ← L261
  <section> Hero (titre + CTA)        shrink-0
  <section> Vidéo                     flex-1   ← reçoit l'espace restant
  <section> « Ils recrutent avec Interw » + 4 logos   shrink-0   ← L313-331
</div>
```

Le bloc de logos est `shrink-0` : il conserve sa hauteur (~120 px de padding + logos) à l'intérieur du fold calé sur `100dvh`. Comme le hero et les logos sont figés, la vidéo (qui n'a que le reste) se retrouve écrasée — c'est le problème signalé.

## Approche retenue
Sortir le bloc de logos du conteneur `md:h-[calc(100dvh-4rem)]` pour qu'il ne soit plus « figé » dans le fold. Il reste présent, mais décolle sous la vidéo et coule naturellement : on le voit en scrollant, la vidéo récupère toute la hauteur disponible.

Concrètement :
1. Déplacer la `<section>` « preuve » (lignes 313-331) **en dehors** du conteneur `flex flex-col md:h-[calc(100dvh-4rem)]`, juste après sa fermeture (après la ligne 332).
2. Le conteneur du fold ne contient plus que le hero (`shrink-0`) et la vidéo (`flex-1`) — la vidéo occupe désormais tout l'espace restant dans le viewport.
3. Le bloc logos garde son style actuel (bordures, grille 4 colonnes), juste placé en flux normal sous le fold. Aucun texte, aucune image, aucune traduction n'est touché.

## Variantes écartées
- **Supprimer complètement les logos** : on perd la preuve sociale, pas souhaité.
- **Réduire juste le padding** du bloc logos : le bloc resterait figé dans le fold, le problème de fond (compétition de hauteur avec la vidéo) persisterait.

## Périmètre
- Un seul fichier modifié : `src/pages/Landing.tsx` (déplacement d'un bloc `<section>`, ~20 lignes).
- Aucune modification du CSS global, des assets, des traductions ou d'autres composants.

## Vérifications
- Compilation du projet (typecheck).
- Contrôle visuel desktop : la vidéo occupe la pleine hauteur restante du fold, les logos apparaissent juste en dessous au scroll.
- Contrôle visuel mobile : le fold n'est plus contraint en hauteur fixe sur mobile (`md:h-[...]` ne s'applique qu'en desktop), le bloc logos s'affiche normalement à la suite.
