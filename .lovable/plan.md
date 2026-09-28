# Temps et navigation dans la vidéo des fiches candidats

## Objectif
Afficher, à côté de chaque réponse vidéo, le temps écoulé et sa durée totale sous la forme `1:05 / 3:42`, et rendre le déplacement dans la vidéo simple et précis, à la souris comme au doigt.

## Plan
1. Sur le lecteur principal de la fiche candidat, ajouter une barre de lecture large et facile à saisir, avec position visible, déplacement par clic ou glissement et accès au clavier. Afficher le temps écoulé / la durée de la réponse en cours ; repartir à zéro au changement de réponse, sans interrompre la lecture ni altérer le son.
2. Harmoniser le petit lecteur des cartes candidats avec le même affichage et le même comportement de déplacement, pour éviter deux expériences différentes.
3. Respecter les contrôles existants (lecture, volume, plein écran, vitesse, téléchargement, changement de question). Vérifier l'absence de gêne avec les contrôles natifs et adapter la disposition sur petit écran ainsi qu'en mode vidéo épinglée.
4. Tester à l'écran : lecture, pause, glissement vers le milieu et la fin, changement de réponse, retour en arrière, clavier et écran étroit ; contrôler aussi les vidéos dont la durée est connue et les anciens enregistrements dont elle ne l'est pas.

## Impact
Uniquement la présentation et la navigation dans les lecteurs des fiches candidats. Aucun changement des vidéos, des rapports, des notes, des données ou du parcours candidat. La durée affichée concerne la **réponse vidéo en cours**, pas la somme des réponses de l'entretien.

## Point d'attention technique
Les deux lecteurs utilisent actuellement les contrôles vidéo du navigateur. Certains anciens fichiers WebM déclarent une durée infinie : il ne faut ni afficher une durée inventée, ni provoquer le saut artificiel qui a déjà cassé leur lecture. Si aucune durée finie et exploitable n'est disponible, afficher `—` et désactiver uniquement le déplacement proportionnel ; la lecture reste possible. Conserver la gestion actuelle des liens temporaires, de la reprise et de la réparation vidéo. Après validation, tenter les vérifications automatiques candidat puis recruteur ; signaler tout blocage au lieu de prétendre qu'elles ont réussi.
