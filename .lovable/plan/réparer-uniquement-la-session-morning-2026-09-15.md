# Réparer uniquement la session Morning

## Objectif immédiat

Rendre lisibles les 15 vidéos de la session `65e1c792-0b11-456d-995e-a7bdd71aad78`, sans modifier le lecteur général, la matrice, les citations horodatées ni les autres entretiens.

## Ce qui est vérifié

- Les 15 réponses existent dans le stockage.
- Le fichier contrôlé techniquement contient une piste vidéo VP9 et une piste audio Opus dans un fichier WebM.
- Chromium parvient à le lire, tandis que le navigateur montré dans les captures renvoie une erreur de décodage.
- Le bouton « Réparer cette vidéo » a affiché une réussite sans avoir vérifié l’image dans le lecteur visible. Cette notification était donc fausse.
- La réparation précédente a seulement réorganisé les fichiers WebM. Elle n’a pas changé leurs formats vidéo et audio ; elle ne pouvait donc pas résoudre une incompatibilité de décodage propre au navigateur.

## Réparation de cette session seulement

1. Télécharger et contrôler séparément les 15 fichiers actuels : format vidéo, format audio, durée, présence d’images réellement décodables et présence du son.
2. Conserver chaque fichier actuel comme sauvegarde, sans écraser les sauvegardes déjà présentes.
3. Convertir chaque réponse en MP4 avec vidéo H.264, audio AAC, durée inscrite et index placé au début du fichier.
4. Contrôler chaque MP4 avant remplacement :
   - une image peut être extraite au début, au milieu et à la fin ;
   - le son est présent ;
   - la durée est finie et cohérente ;
   - la vidéo commence au bon moment et n’est pas tronquée.
5. Enregistrer les 15 versions compatibles dans le stockage privé.
6. Faire pointer uniquement les 15 réponses de cette session vers ces nouveaux fichiers, sans modifier les transcriptions, les citations, les scores ou le rapport.
7. En cas d’échec sur une vidéo, ne pas remplacer sa référence et indiquer précisément son numéro et son erreur.

## Horodatages et matrice

- Cette phase ne modifie aucun horodatage généré par l’IA.
- Les nouvelles vidéos conservent la même chronologie que les originales : départ à zéro, vitesse normale, aucune coupe.
- Avant remplacement, la durée de chaque nouvelle vidéo sera comparée à l’originale. Une différence supérieure à 0,25 seconde bloque le remplacement.
- Après remplacement, chaque citation testée depuis la matrice doit ouvrir la bonne réponse au moment attendu. Si ce contrôle échoue, la réparation est considérée comme non terminée.

## Impact

- **Construction de l’application : aucun risque**, car aucun code de l’application n’est modifié dans cette phase.
- **Recruteur :** seule cette session change ; ses vidéos doivent devenir compatibles avec les navigateurs courants.
- **Candidat :** aucun changement et aucun nouvel envoi.
- **Données :** les originaux restent conservés. Le retour arrière est possible fichier par fichier.
- **Scoring, transcription, matrice et rapport :** aucune régénération et aucun recalcul.
- **Sécurité :** stockage toujours privé, accès toujours contrôlé par les adresses temporaires.

## Tests après approbation

1. **Côté candidat :** exécuter le parcours de démonstration avec caméra et micro, enregistrer puis envoyer une réponse, afin de vérifier que l’intervention sur cette session n’a rien affecté.
2. **Côté recruteur :** ouvrir cette session dans Chromium puis WebKit ; lire réellement les 15 vidéos avec image et son ; passer de l’une à l’autre ; vérifier l’absence de boucle et d’écran noir.
3. Depuis la matrice, tester plusieurs citations horodatées réparties entre le début, le milieu et la fin de l’entretien ; confirmer que chaque clic ouvre la bonne vidéo au passage correspondant.

## Après cette réparation

Une fois cette session réellement validée dans les deux navigateurs, nous ferons séparément l’audit de fond du cycle complet : enregistrement candidat, format produit, durée, stockage, lecture et citations horodatées. Aucun changement général n’est inclus ici.

## Durée et matrice : ce qui est garanti

- L’ancienne astuce du saut forcé n’est pas rétablie. Elle servait uniquement à compenser une durée absente et provoquait la boucle.
- La conversion inscrit la durée réelle dans chaque fichier. Le lecteur la connaît donc dès l’ouverture, sans aucune manipulation.
- Comme la durée est connue, le déplacement vers un instant précis redevient possible sur ces vidéos : les renvois de la matrice ouvrent la bonne réponse au bon moment, et les sauts de dix secondes sont de nouveau actifs.
- La chronologie reste identique à l’originale, donc les instants cités par l’analyse restent valables sans recalcul.
- Si une vidéo ne peut pas recevoir de durée fiable, elle n’est pas remplacée et elle est signalée nommément plutôt que laissée dans un état approximatif.
