# Vidéo de Julie Safari : encore un cadre noir chez toi

## Ce que j'ai vérifié maintenant

Les cinq vidéos de la session sont bonnes côté serveur : téléchargées à l'instant, elles ont toutes leur image, leur son et leur durée (1 min 19, 1 min 29, 1 min 10, 2 min 54, 1 min 31). Les adresses enregistrées sur la fiche pointent bien vers ces fichiers réparés.

Autrement dit, le message « Vidéo indisponible — lecture audio uniquement » que tu vois ne vient plus du fichier : ton navigateur rejoue très probablement l'ancienne version abîmée gardée en mémoire (elle a la même adresse qu'avant la réparation).

## Correction proposée

Ajouter une « signature » à l'adresse de chaque vidéo au moment de la lecture, pour que le navigateur aille toujours chercher la version à jour au lieu de sa copie locale. Aujourd'hui cette signature n'est ajoutée qu'après une réparation manuelle, donc une copie périmée peut rester affichée indéfiniment.

En complément, quand la lecture échoue une seconde fois après réparation automatique, afficher un message explicite invitant à recharger la page, plutôt que de laisser le cadre noir.

## Détails techniques

Fichier concerné : `src/components/session/SessionVideoNavigator.tsx` uniquement.

- Au chargement d'un clip, construire la source vidéo avec un paramètre de version stable par clip (basé sur l'identifiant du message + un horodatage de montage), afin de contourner le cache navigateur/CDN sur les fichiers réparés à chemin identique.
- Conserver la réparation automatique existante (`autoRecoveredRef`, erreur média code 3) et le bouton manuel.
- Si `mediaError` réapparaît après une tentative de réparation sur le même clip, remplacer le libellé par un message de type « Rechargez la page pour récupérer la version réparée ».

Aucun changement de données, aucune autre session, organisation ou projet touché.

## Vérification

Typecheck, puis lecture des cinq clips dans un navigateur de test pour confirmer que la source chargée comporte bien le paramètre de version et démarre sans erreur.
