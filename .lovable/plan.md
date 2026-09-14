# Fiabiliser durablement la lecture des vidéos privées

## Pourquoi cela arrive depuis la correction de sécurité

La mise en privé était nécessaire : avant, une adresse directe suffisait pour ouvrir un enregistrement. Depuis, le lecteur doit d'abord obtenir une adresse temporaire autorisée, puis le navigateur télécharge la vidéo avec cette adresse.

Le problème vient de l'adaptation incomplète du lecteur à ce nouveau fonctionnement :

1. **Toutes les adresses temporaires d'une session sont demandées dès l'ouverture de la fiche**, même pour les vidéos qui seront regardées plus tard.
2. Elles sont valables une heure, mais le lecteur conserve ensuite sa première copie sans la renouveler automatiquement.
3. Quand une adresse devient inutilisable, **« Réessayer la vidéo » recharge exactement la même adresse**. Le bouton ne redemande pas une adresse valide.
4. Le lecteur traduit plusieurs situations différentes par « Réseau indisponible » : adresse expirée, autorisation refusée, fichier absent, téléchargement interrompu ou véritable coupure réseau.
5. « Réparer la vidéo » peut alors être proposé alors que le fichier n'est pas endommagé : une réparation ne doit servir qu'aux anciens fichiers réellement illisibles.

Sur l'incident vérifié pendant cette analyse, l'autorisation a bien été accordée et le stockage a répondu **200** pour le fichier demandé. Cela exclut un blocage général dû au passage en privé. L'échec se produit ensuite dans la chaîne de lecture du navigateur. Les journaux actuels ne permettent pas encore de séparer précisément une adresse périmée, un transfert interrompu et un problème de décodage : c'est aussi ce que le correctif doit résoudre.

La sécurité n'a donc pas « supprimé » les vidéos. Elle a ajouté une étape obligatoire de délivrance d'adresse, mais le lecteur n'a pas encore la gestion complète du renouvellement, des reprises et du diagnostic.

## Objectif

Conserver le stockage privé, tout en rendant la lecture aussi fiable qu'avant : adresse demandée au moment utile, renouvellement silencieux, reprise automatique, diagnostic exact et réparation réservée aux fichiers réellement défectueux.

## Correction proposée

### 1. Charger uniquement la vidéo demandée

- Ne plus demander les adresses de toutes les réponses à l'ouverture de la fiche.
- Demander une adresse temporaire pour la vidéo courante, juste avant sa lecture.
- Précharger uniquement la suivante afin de garder une navigation fluide.
- Conserver les chemins de stockage comme source de vérité, jamais une ancienne adresse temporaire.

**Bénéfice :** une vidéo regardée tardivement ne démarre plus avec une adresse déjà ancienne.

### 2. Ajouter un véritable renouvellement automatique

- La réponse du serveur expose déjà la durée de validité ; l'utiliser réellement côté lecteur.
- Renouveler l'adresse quelques minutes avant son expiration si la fiche reste ouverte.
- En cas d'erreur de chargement, invalider immédiatement l'adresse conservée, en demander une nouvelle et reprendre la lecture au même instant.
- Limiter cette reprise automatique à une tentative par incident afin d'éviter les boucles.
- Faire de « Réessayer » une vraie nouvelle tentative : nouvelle adresse, nouvelle requête, position de lecture conservée.

**Bénéfice :** aucune action manuelle pour une expiration normale ou une coupure momentanée.

### 3. Séparer les quatre familles d'erreurs

Le lecteur effectuera un contrôle serveur après un échec et classera le problème :

- **adresse expirée ou refusée** : nouvelle autorisation automatique ;
- **fichier absent** : message « Enregistrement introuvable », sans proposer une fausse réparation ;
- **fichier présent mais non décodable** : réparation automatique existante, puis solution audio si disponible ;
- **réseau réellement indisponible** : reprises espacées, puis message clair si la connexion ne revient pas.

Le message générique « Réseau indisponible » ne sera plus utilisé pour toutes les erreurs.

### 4. Rendre le serveur observable

- Journaliser chaque demande d'adresse sans enregistrer le jeton ni l'adresse signée : session, fichier, utilisateur autorisé ou candidat, résultat, durée et motif du refus.
- Ajouter un identifiant de diagnostic renvoyé au lecteur et affichable dans le détail d'une erreur.
- Mesurer séparément : autorisations refusées, fichiers absents, échecs de signature et lectures interrompues après une signature réussie.
- Prévoir une rétention courte et un accès réservé aux administrateurs.

**Bénéfice :** le prochain incident sera attribuable en quelques minutes, sans supposition et sans exposer de donnée sensible.

### 5. Nettoyer les anciennes adresses stockées

Le dépôt privé contient encore des adresses publiques historiques dans les données. Elles sont aujourd'hui converties à la volée.

- Recenser tous les formats réellement présents avant modification.
- Convertir progressivement les adresses d'enregistrements en chemins internes `interviews/<session>/<fichier>`.
- À l'enregistrement d'une nouvelle réponse, sauvegarder directement ce chemin interne au lieu de fabriquer une adresse publique inutilisable.
- Garder temporairement la compatibilité avec les anciennes lignes, puis la retirer seulement après contrôle complet.

**Bénéfice :** une seule représentation stable des fichiers, indépendante du réglage public ou privé.

### 6. Unifier les règles de chemin

- Centraliser la normalisation et la validation des chemins utilisée par le serveur.
- Ajouter des essais de contrat couvrant : chemin moderne, ancienne adresse publique, ancienne adresse signée, caractères encodés, autre session et chemin interdit.
- Ajouter un contrôle automatique empêchant tout nouvel usage d'une adresse publique pour `interviews/`.

**Bénéfice :** une future page ou intégration ne pourra pas contourner par erreur le nouveau mécanisme.

### 7. Couvrir tous les lecteurs

Appliquer le même comportement au lecteur principal, aux extraits, aux temps forts, à l'export et aux rapports partagés. Les rapports partagés conserveront leur propre autorisation ; aucun enregistrement ne deviendra public.

## Ordre de livraison sans interruption

### Étape A — Mesurer avant de changer

1. Ajouter les journaux de diagnostic.
2. Reproduire les cas sur des vidéos récentes et anciennes.
3. Chiffrer les erreurs par catégorie et vérifier les formats historiques en base.

### Étape B — Corriger la lecture

1. Résolution à la demande de la vidéo courante.
2. Renouvellement avant expiration.
3. Nouvelle adresse et reprise au même instant après erreur.
4. Messages exacts et séparation stricte entre reprise réseau et réparation de fichier.

### Étape C — Normaliser sans casser l'historique

1. Les nouveaux enregistrements stockent un chemin interne.
2. Migration progressive des anciennes lignes par lots contrôlés.
3. Compatibilité maintenue pendant la transition.
4. Suppression de la compatibilité uniquement après vérification de l'intégralité des données.

### Étape D — Généraliser et surveiller

1. Étendre le mécanisme aux autres lecteurs et rapports partagés.
2. Ajouter les contrôles automatiques de non-régression.
3. Suivre les taux d'échec pendant plusieurs jours avant de considérer l'incident clos.

## Vérifications obligatoires

- Vidéo récente et vidéo historique sur Chrome, Firefox et Safari.
- Première, dernière et plusieurs vidéos successives d'une même session.
- Fiche laissée ouverte au-delà de la durée d'une adresse temporaire.
- Mise hors ligne puis retour du réseau, avec reprise au même instant.
- Adresse expirée, fichier absent et fichier réellement non décodable : trois comportements distincts.
- Recruteur autorisé, recruteur d'une autre organisation, candidat avec bon ou mauvais jeton, super-administrateur et rapport partagé.
- Téléchargement et export inchangés.
- Stockage toujours privé et ancienne adresse publique toujours refusée.
- Aucun changement du scoring, de la transcription ou des analyses.

## Critères de réussite

- Une expiration ou un incident réseau bref se résout automatiquement, sans écran noir persistant.
- « Réessayer » renouvelle réellement l'accès au lieu de recharger une adresse morte.
- « Réparer » n'apparaît que lorsque le fichier est présent mais réellement illisible.
- Chaque échec restant possède une cause mesurable dans les journaux.
- Aucun lecteur de l'application ne consomme directement une adresse publique d'entretien.
- Les vidéos restent privées pendant toute la correction.

## Périmètre protégé

- Aucun retour du stockage en public.
- Aucun changement du scoring, de la transcription, de l'analyse orale ou non verbale.
- Aucun changement des données des candidats, sauf la normalisation technique progressive des chemins vidéo.
- Le plan séparé sur les entretiens interrompus par un micro trop faible reste en attente et sera repris après cette priorité.
