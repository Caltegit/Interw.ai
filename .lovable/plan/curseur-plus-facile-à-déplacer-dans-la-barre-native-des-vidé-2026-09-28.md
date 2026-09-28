# Curseur plus facile à déplacer dans la barre native des vidéos

## Objectif
Ne garder qu'un seul curseur : celui de la barre de contrôle dans la vidéo, qui reste visuellement identique. Il doit devenir plus facile à saisir et à déplacer. Le curseur ajouté sous la vidéo (doublon) est supprimé.

## Constat
La barre de contrôle dans la vidéo est dessinée par le navigateur : impossible de la redessiner ni d'agrandir son curseur. En revanche, on peut poser par-dessus une zone de préhension invisible, alignée sur la barre de progression, qui capte le doigt et la souris et déplace la lecture à la position visée. Le rendu ne change pas, la prise en main devient confortable.

## Plan
1. Supprimer le curseur ajouté sous la vidéo dans les deux lecteurs (fiche rapport et carte candidat), et le composant dédié avec lui.
2. Dans chaque lecteur, ajouter une zone de préhension invisible sur la bande de la barre de progression (bas de la vidéo, hors boutons volume et plein écran) :
   - clic à n'importe quel endroit de la bande pour y déplacer la lecture ;
   - glissement continu (souris et doigt) pour naviguer précisément ;
   - hauteur bien supérieure au trait visible, pour une prise facile ;
   - flèches gauche/droite au clavier pour avancer ou reculer.
3. Conserver tout le reste : barre native inchangée, gros bouton central, ±10s, vitesse, téléchargement MP4, overlay du titre, changement de question, mode épinglé, volume et plein écran natifs.
4. Anciennes vidéos sans durée connue (WebM d'origine) : la zone reste inactive, la lecture et la barre native restent disponibles. Aucun saut forcé dans le fichier.
5. Tester à l'écran : clic au milieu, glissement vers la fin, retour en arrière, changement de réponse, volume et plein écran natifs toujours cliquables, clavier, écran étroit et mode épinglé ; puis vérifications automatiques candidat puis recruteur — tout blocage sera signalé, pas dissimulé.

## Impact
Uniquement la prise en main du curseur dans les deux lecteurs vidéo des fiches candidats. Aucun changement visuel, aucune modification des vidéos, des rapports, des notes, de la matrice, des données ou du parcours candidat.

## Point d'attention technique
La zone invisible capte les clics sur la bande de progression : elle doit laisser passer les boutons natifs voisins (volume, plein écran, lecture, menu) pour qu'ils restent utilisables. Le gestionnaire de son existant et la réparation automatique des liens sont conservés tels quels.
