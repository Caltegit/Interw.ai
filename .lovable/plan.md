# Durée totale affichée dès l'ouverture de la fiche candidat

## Cause confirmée

Les enregistrements WebM produits par le navigateur du candidat ne déclarent pas de durée dans leurs métadonnées : le navigateur du recruteur lit « durée infinie » au chargement. Ce n'est qu'après une vingtaine de secondes de lecture, quand il a chargé assez de données, qu'il réévalue et annonce une durée réelle — via un événement « durationchange ».

Or les deux lecteurs des fiches candidats (`SessionClipPlayer` et `SessionVideoNavigator`) ne lisent la durée qu'au chargement des métadonnées (`loadedmetadata`). Personne n'écoute « durationchange » : la durée réelle arrive donc avec ~20 secondes de retard, et la zone de navigation reste inactive entre-temps.

## Plan

1. Dans `SessionClipPlayer` (cartes candidats et vue rapport) : écouter l'événement `durationchange` de la vidéo ; dès que la durée devient finie et positive, l'afficher et activer la navigation. La durée apparaît alors dès que le navigateur la connaît, sans attendre la lecture.
2. Même correction dans `SessionVideoNavigator` (lecteur principal de la fiche candidat).
3. Aucun saut forcé dans le fichier, aucune conversion des vidéos : on se contente de capter l'information dès qu'elle existe. Si une vidéo n'a vraiment aucune durée exploitable, l'affichage reste « — » comme aujourd'hui.
4. Vérifier à l'écran sur une vraie fiche : la durée totale doit s'afficher dès l'ouverture (ou dès les premières secondes de chargement), la zone de navigation doit être active immédiatement, et la lecture, le volume et le plein écran natifs restent inchangés.

## Impact

Uniquement l'affichage de la durée dans les deux lecteurs des fiches candidats. Aucun changement visuel, aucune modification des vidéos, des rapports, des notes, des données ou du parcours candidat. Risque de casse quasi nul : on ajoute un écouteur d'événement, sans toucher à la logique de lecture.
