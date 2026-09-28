# Barre de lecture intégrée à la vidéo des fiches candidats

## Objectif
Un seul curseur, à l'intérieur de la vidéo, qui affiche `0:12 / 1:53` et se déplace précisément — comme sur YouTube. Le curseur ajouté sous la vidéo (doublon) est supprimé.

## Constat
La barre native du navigateur ne peut pas être améliorée : ses dimensions et son comportement sont imposés. La seule façon d'avoir une barre confortable dans la vidéo est de remplacer les contrôles natifs par une barre personnalisée, affichée dans le lecteur.

## Plan
1. Supprimer le curseur ajouté sous la vidéo dans les deux lecteurs (fiche rapport et carte candidat), et le composant dédié avec lui.
2. Dans chaque lecteur, retirer les contrôles natifs et ajouter une barre de contrôle intégrée en bas de la vidéo, visible au survol ou à la pause (masquée pendant la lecture après un court délai) :
   - grande barre de progression pleine largeur, saisissable à la souris, au doigt et au clavier, avec position visible pendant le glissement ;
   - temps écoulé / durée totale `0:12 / 1:53` à gauche ;
   - boutons lecture/pause, volume (coupé ou non) et plein écran à droite.
3. Conserver tous les contrôles existants : gros bouton central, ±10s, vitesse, téléchargement MP4, overlay du titre de question, changement de question, mode épinglé.
4. Anciennes vidéos sans durée connue (WebM d'origine) : afficher `—` à la place de la durée, désactiver uniquement le déplacement proportionnel, la lecture reste possible. Aucun saut forcé dans le fichier.
5. Mettre à jour la règle interne des lecteurs vidéo pour refléter la barre intégrée unique.
6. Tester à l'écran : lecture, pause, glissement au milieu et vers la fin, retour en arrière, changement de réponse, volume, plein écran, clavier, écran étroit et mode épinglé ; puis vérifications automatiques candidat puis recruteur — tout blocage sera signalé, pas dissimulé.

## Impact
Uniquement l'apparence et la navigation des deux lecteurs vidéo des fiches candidats. Aucun changement des vidéos, des rapports, des notes, de la matrice, des données ou du parcours candidat. La durée affichée reste celle de la réponse en cours.

## Point d'attention technique
La barre remplace les contrôles natifs : les fonctions qu'ils assuraient (volume, plein écran) sont reprises par les nouveaux boutons. Le gestionnaire de son existant (intention du recruteur préservée malgré les coupures momentanées au démarrage) et la réparation automatique des liens sont conservés tels quels. En mode épinglé compact, la barre reste utilisable mais plus discrète.
