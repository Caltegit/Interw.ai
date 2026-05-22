Masquer le bouton « X entretiens sans rapport » sur la page projet — il n'a pas de réelle utilité pour l'instant.

## Changement

Dans `src/pages/ProjectDetail.tsx` (ligne 727), remplacer la condition `{processingCount > 0 && (` par `{false && (` pour ne plus afficher le `<Popover>`.

Le code reste en place (commenté implicitement par la condition) pour pouvoir le réactiver plus tard sans le réécrire.

## Validation

Recharger la page d'un projet qui a des sessions sans rapport et vérifier que le bouton ambré n'apparaît plus.
