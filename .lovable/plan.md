# Aligner le lecteur de la vue cartes sur celui du rapport

Le lecteur compact `src/components/project/SessionCard.tsx` (vignette vidéo de la liste des sessions) reçoit les 4 mêmes améliorations que `SessionVideoNavigator` :

## 1. Enchaînement automatique
Handler `onEnded` sur `<video>` : si pas le dernier clip → passer au suivant avec autoplay.

## 2. Coupure propre de la vidéo précédente
- Ajouter une fonction `stopCurrent()` (await de la promesse `play()` en attente, puis `pause()` + reset `currentTime`).
- L'appeler avant tout changement d'index (Précédent / Suivant / sélecteur / fin de vidéo).
- Dans le cleanup du `useEffect`, faire un `pause()` sur l'élément démonté.

## 3. Sélecteur de question
Remplacer le texte « Question X / Y » par un `Select` shadcn compact :
- Trigger discret reprenant le format actuel.
- Liste : « Q{n} — {contenu tronqué} » + badge « Relance » si `isFollowUp`.
- Largeur limitée pour rester dans la carte étroite.

## 4. Boutons -10s / +10s
Overlay en haut au centre de la vidéo, mêmes styles ronds semi-transparents que dans le rapport (`bg-black/50`, icônes `RotateCcw` / `RotateCw`, libellé « 10s »).

## Hors scope
- Pas de changement sur les boutons décision / score / identité.
- Pas de raccourcis clavier.

## Fichiers modifiés
- `src/components/project/SessionCard.tsx` (seul fichier touché)
