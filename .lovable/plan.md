# Landing : le bloc « Ils recrutent avec Interw » est masqué

## Problème constaté

Depuis l'agrandissement de la vidéo hero, celle-ci remplit entièrement le fold (`md:h-[calc(100dvh-4rem)]`). La section logos/preuve qui était à l'intérieur du même conteneur flex est repoussée hors de la fenêtre visible ; l'utilisateur ne la voit plus sans scroller, ce qui la rend invisible sur la plupart des écrans.

## Correctif

Sortir la section « preuve » du conteneur à hauteur fixe dans `src/pages/Landing.tsx`. Le fold ne contiendra plus que le hero (titre + CTA) et la vidéo. La section logos passera dans le flux normal, juste en dessous : elle apparaîtra dès que l'utilisateur scrolle naturellement.

```text
AVANT :
<div class="flex flex-col md:h-[calc(100dvh-4rem)]">
  hero
  video
  preuve   ← écrasée par la vidéo
</div>

APRÈS :
<div class="flex flex-col md:h-[calc(100dvh-4rem)]">
  hero
  video
</div>
<preuve>   ← hors fold, visible au scroll
```

## Fichier concerné

- `src/pages/Landing.tsx` (lignes 328-353)

## Vérification

- Capture desktop : la section logos est visible sous la vidéo sans être coupée.
- Capture mobile : pas de hauteur fixe en mobile (`md:` uniquement), le bloc s'affiche normalement.
- Pas de régression sur la taille de la vidéo ni sur les boutons.
