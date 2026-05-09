# Boutons -10s / +10s sur le lecteur vidéo

Ajout de deux boutons de navigation rapide sur le lecteur de session (`src/components/session/SessionVideoNavigator.tsx`).

## Emplacement et apparence

- Positionnés en overlay sur la vidéo, **en haut au centre**, côte à côte avec un petit espace.
- Style : bouton rond semi-transparent (fond `bg-black/50`, texte blanc), discret au repos, opacité légèrement renforcée au hover.
- Icônes Lucide : `Rewind` (ou `RotateCcw`) à gauche avec libellé « 10s », `FastForward` (ou `RotateCw`) à droite avec « 10s ».
- N'interfère pas avec les contrôles natifs `<video controls>` qui restent en bas.

## Comportement

- Clic sur « -10s » : `videoRef.current.currentTime = max(0, currentTime - 10)`.
- Clic sur « +10s » : `videoRef.current.currentTime = min(duration - 0.1, currentTime + 10)`.
- Pas de changement d'état de lecture (si la vidéo joue, elle continue ; si en pause, elle reste en pause).
- Désactivés tant que la durée n'est pas connue (`durationSec === null`).

## Hors scope

- Pas de raccourcis clavier (à demander si souhaité).
- Pas de modification du composant `HighlightReelPlayer`.
- Pas de changement sur les boutons Précédent / Suivant / vitesse / sélecteur de question.

## Fichiers modifiés

- `src/components/session/SessionVideoNavigator.tsx` (seul fichier touché)
