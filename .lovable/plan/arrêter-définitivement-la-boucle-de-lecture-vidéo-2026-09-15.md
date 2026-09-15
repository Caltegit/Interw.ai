# Arrêter définitivement la boucle de lecture vidéo

## Diagnostic confirmé

La réparation des 15 fichiers n’a pas suffi. Sur la session `65e1c792-0b11-456d-995e-a7bdd71aad78`, toutes les vidéos renvoient actuellement une erreur de décodage, puis le lecteur recommence chaque seconde avec une nouvelle adresse temporaire.

Le cycle est visible dans le code actuel :

1. l’erreur vidéo déclenche le renouvellement de l’adresse ;
2. la vidéo est rechargée ;
3. `onLoadedMetadata` supprime immédiatement la trace de la tentative précédente ;
4. si le décodage échoue ensuite, le lecteur pense qu’il s’agit de la première erreur et recommence sans limite.

Le calcul forcé de durée des anciens WebM, qui déplace la lecture très loin dans le fichier, peut aussi provoquer cette erreur après un début de chargement pourtant réussi.

## Correction ciblée

### 1. Supprimer la boucle dans la fiche candidat

Dans le lecteur principal :

- conserver le nombre d’échecs pour chaque vidéo pendant toute l’ouverture de la fiche ;
- ne jamais remettre ce compteur à zéro lors d’un simple chargement des métadonnées ;
- renouveler l’adresse uniquement pour une erreur réseau ou une adresse refusée, jamais pour une erreur de décodage ;
- arrêter automatiquement après un nouvel essai maximum ;
- afficher ensuite un état stable avec « Réessayer », sans rechargement automatique.

### 2. Rendre le calcul de durée non bloquant

- ne plus déplacer automatiquement la tête de lecture à `1e9` avant la lecture ;
- utiliser directement la durée lorsqu’elle est disponible ;
- si elle reste inconnue, autoriser quand même lecture et son depuis le début ;
- désactiver seulement les commandes dépendant d’une durée fiable, sans afficher « Ré-encodage vidéo » sur les autres vidéos.

### 3. Appliquer le même garde-fou au lecteur secondaire

Le lecteur utilisé dans les autres vues contient le même enchaînement. Il recevra uniquement les mêmes protections contre le renouvellement infini, afin que le problème ne réapparaisse pas ailleurs.

Aucun fichier vidéo ne sera supprimé ou remplacé pendant cette correction.

## Impact

- **Risque de casse du build : faible** — deux lecteurs vidéo existants sont modifiés, sans migration ni changement du stockage sécurisé.
- **Côté recruteur :** la fiche ne pourra plus tourner en boucle. Une vidéo réellement incompatible restera arrêtée avec une action manuelle claire ; les autres vidéos resteront accessibles.
- **Côté candidat :** aucun changement dans les questions, l’enregistrement ou l’envoi des réponses.
- **Sécurité :** aucune adresse publique rétablie ; les autorisations temporaires restent obligatoires.
- **Scoring, transcription et rapports :** aucun changement.
- **Effet de bord possible :** pour un ancien fichier dont la durée est impossible à déterminer, la durée et les sauts de dix secondes pourront être indisponibles, mais la lecture simple restera prioritaire.

## Tests après approbation

### 1. Test candidat

Parcourir l’entretien de démonstration avec caméra et micro, démarrer puis arrêter un enregistrement, et vérifier que la réponse vidéo reste envoyable sans erreur.

### 2. Test recruteur

Ouvrir la session Morning concernée et contrôler les 15 réponses :

- lecture de chaque vidéo ;
- absence de renouvellement en boucle ;
- passage d’une vidéo à l’autre ;
- arrêt stable et bouton « Réessayer » si une vidéo échoue réellement ;
- vérification du nombre de demandes d’adresses temporaires pour confirmer la disparition de la boucle.

Si une vidéo précise reste indécodable après la correction du lecteur, elle sera identifiée avec son numéro exact et son erreur réelle, sans déclencher de réparation générale ni toucher aux 14 autres.
